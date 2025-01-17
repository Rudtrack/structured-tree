import { Menu, Plugin, TAbstractFile, TFile, addIcon, View } from "obsidian";
import { StructuredView, VIEW_TYPE_STRUCTURED } from "./view";
import { activeFile, structuredVaultList } from "./store";
import { structuredActivityBarIcon, structuredActivityBarName } from "./icons";
import {
  DEFAULT_SETTINGS,
  StructuredTreePluginSettings,
  StructuredTreeSettingTab,
} from "./settings";
import { parsePath } from "./path";
import { StructuredWorkspace } from "./engine/structuredWorkspace";
import { CustomResolver } from "./custom-resolver";
import { CustomGraph } from "./custom-graph";
import { createNewNoteCommand } from "./commands/createNewNote";
import { lookupNoteCommand } from "./commands/lookupNote";
import { renameNoteCommand } from "./commands/renameNote";
import { collapseAllCommand } from "./commands/collapseAll";
import { generateIdCommand } from "./commands/generateId";
import { openParentNoteCommand } from "./commands/openParentNote";
import { moveNoteCommand } from "./commands/moveNote";

interface GraphViewWithRenderer extends View {
  renderer?: {
    engine?: {
      render: () => void;
    };
  };
}

export default class StructuredTreePlugin extends Plugin {
  settings: StructuredTreePluginSettings;
  workspace: StructuredWorkspace;
  customResolver?: CustomResolver;
  customGraph?: CustomGraph;

  async onload() {
    await this.loadSettings();
    await this.migrateSettings();

    this.workspace = new StructuredWorkspace(this.app, this.settings);

    addIcon(structuredActivityBarName, structuredActivityBarIcon);

    this.addCommand(lookupNoteCommand(this.app, this.workspace, this.settings));
    this.addCommand(createNewNoteCommand(this.app, this.workspace));
    this.addCommand(renameNoteCommand(this.app, this.workspace, () => this.updateNoteStore()));
    this.addCommand(moveNoteCommand(this.app, this.workspace));
    this.addCommand(collapseAllCommand(this.app));
    this.addCommand(
      generateIdCommand(this.app, this.workspace, this.settings, () => this.updateNoteStore())
    );
    this.addCommand(openParentNoteCommand(this.app, this.workspace));
    this.addCommand({
      id: "open-structured-tree",
      name: "Open Tree",
      callback: () => this.activateView(),
    });

    this.addSettingTab(new StructuredTreeSettingTab(this.app, this));

    this.registerView(VIEW_TYPE_STRUCTURED, (leaf) => new StructuredView(leaf, this));

    this.addRibbonIcon(structuredActivityBarName, "Open Structured Tree", () => {
      this.activateView();
    });

    this.app.workspace.onLayoutReady(() => {
      this.onRootFolderChanged();

      this.registerEvent(this.app.vault.on("create", this.onCreateFile));
      this.registerEvent(this.app.vault.on("delete", this.onDeleteFile));
      this.registerEvent(this.app.vault.on("rename", this.onRenameFile));
      this.registerEvent(this.app.metadataCache.on("resolve", this.onResolveMetadata));
      this.registerEvent(this.app.workspace.on("file-open", this.onOpenFile, this));
      this.registerEvent(this.app.workspace.on("file-menu", this.onFileMenu));

      // Configure custom graph after layout is ready
      this.configureCustomResolver();
      this.configureCustomGraph();
    });
  }

  async migrateSettings() {
    function pathToVaultConfig(path: string) {
      const { name } = parsePath(path);
      if (name.length === 0)
        return {
          name: "root",
          path: "/",
        };
      let processed = path;
      if (processed.endsWith("/")) processed = processed.slice(0, -1);
      if (processed.startsWith("/") && processed.length > 1) processed = processed.slice(1);
      return {
        name,
        path: processed,
      };
    }

    if (this.settings.vaultPath) {
      this.settings.vaultList = [pathToVaultConfig(this.settings.vaultPath)];
      this.settings.vaultPath = undefined;
      await this.saveSettings();
    }
    if (this.settings.vaultList.length > 0 && typeof this.settings.vaultList[0] === "string") {
      this.settings.vaultList = (this.settings.vaultList as unknown as string[]).map((path) =>
        pathToVaultConfig(path)
      );
      await this.saveSettings();
    }
  }

  onunload() {}

  onRootFolderChanged() {
    this.workspace.changeVault(this.settings.vaultList);
    this.updateNoteStore();
  }

  configureCustomResolver() {
    if (this.settings.customResolver && !this.customResolver) {
      this.customResolver = new CustomResolver(this, this.workspace);
      this.addChild(this.customResolver);
    } else if (!this.settings.customResolver && this.customResolver) {
      this.removeChild(this.customResolver);
      this.customResolver = undefined;
    }
  }

  configureCustomGraph() {
    if (this.settings.customGraph && !this.customGraph) {
      this.customGraph = new CustomGraph(this, this.workspace);
      this.addChild(this.customGraph);
      this.initializeCustomGraphForExistingViews();
      this.registerEvent(
        this.app.workspace.on("active-leaf-change", (leaf) => {
          if (leaf && leaf.view && leaf.view.getViewType() === "graph") {
            this.initializeCustomGraphForExistingViews();
          }
        })
      );
    } else if (!this.settings.customGraph && this.customGraph) {
      this.removeChild(this.customGraph);
      this.customGraph = undefined;
    }
  }

  initializeCustomGraphForExistingViews() {
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (leaf.view instanceof View && leaf.view.getViewType() === "graph") {
        const graphView = leaf.view as GraphViewWithRenderer;
        if (this.isGraphViewWithRenderer(graphView)) {
          setTimeout(() => {
            graphView.renderer?.engine?.render();
          }, 100);
        }
      }
    });
  }

  private isGraphViewWithRenderer(view: View): view is GraphViewWithRenderer {
    return (
      "renderer" in view &&
      typeof (view as GraphViewWithRenderer).renderer === "object" &&
      (view as GraphViewWithRenderer).renderer !== null &&
      typeof (view as GraphViewWithRenderer).renderer === "object" &&
      "engine" in ((view as GraphViewWithRenderer).renderer as object)
    );
  }

  updateNoteStore() {
    structuredVaultList.set(this.workspace.vaultList);
  }

  onCreateFile = async (file: TAbstractFile) => {
    const vault = this.workspace.findVaultByParent(file.parent);
    if (vault && vault.onFileCreated(file)) {
      if (this.settings.autoGenerateFrontmatter && file instanceof TFile && file.stat.size === 0)
        await vault.generateFrontmatter(file);
      this.updateNoteStore();
    }
  };

  onDeleteFile = (file: TAbstractFile) => {
    // file.parent is null when file is deleted
    const parsed = parsePath(file.path);
    const vault = this.workspace.findVaultByParentPath(parsed.dir);
    if (vault && vault.onFileDeleted(parsed)) {
      this.updateNoteStore();
    }
  };

  onRenameFile = (file: TAbstractFile, oldPath: string) => {
    const oldParsed = parsePath(oldPath);
    const oldVault = this.workspace.findVaultByParentPath(oldParsed.dir);
    let update = false;
    if (oldVault) {
      update = oldVault.onFileDeleted(oldParsed);
    }

    const newVault = this.workspace.findVaultByParent(file.parent);
    if (newVault) {
      update = newVault.onFileCreated(file) || update;
    }
    if (update) this.updateNoteStore();
  };

  onOpenFile(file: TFile | null) {
    activeFile.set(file);
    if (file && this.settings.autoReveal) this.revealFile(file);
  }

  onFileMenu = (menu: Menu, file: TAbstractFile) => {
    if (!(file instanceof TFile)) return;

    menu.addItem((item) => {
      item
        .setIcon(structuredActivityBarName)
        .setTitle("Reveal in Structured Tree")
        .onClick(() => this.revealFile(file));
    });
  };

  onResolveMetadata = (file: TFile) => {
    const vault = this.workspace.findVaultByParent(file.parent);
    if (vault && vault.onMetadataChanged(file)) {
      this.updateNoteStore();
    }
  };

  async revealFile(file: TFile) {
    const vault = this.workspace.findVaultByParent(file.parent);
    if (!vault) return;
    const note = vault.tree.getFromFileName(file.basename, this.settings);
    if (!note) return;

    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_STRUCTURED);
    for (const leaf of leaves) {
      if (leaf.view instanceof StructuredView) {
        leaf.view.component.focusTo(vault, note);
        // Don't reveal the leaf, just update the view
        return;
      }
    }
  }

  async activateView() {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_STRUCTURED);
    if (leaves.length == 0) {
      const leaf = this.app.workspace.getLeftLeaf(false);
      if (leaf) {
        await leaf.setViewState({
          type: VIEW_TYPE_STRUCTURED,
          active: true,
        });
        this.app.workspace.revealLeaf(leaf);
      }
    } else {
      leaves.forEach((leaf) => {
        if (leaf.view instanceof StructuredView) {
          this.app.workspace.revealLeaf(leaf);
        }
      });
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    this.settings.hierarchySeparator = this.settings.hierarchySeparator || ".";
    if (!this.settings.excludedPaths) {
      this.settings.excludedPaths = [];
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.workspace.vaultList.forEach((vault) => vault.updateAcceptedExtensionsCache());
    this.app.workspace.trigger("structured-tree:settings-changed");
  }
}
