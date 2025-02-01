import { App, ButtonComponent, Notice, PluginSettingTab, Setting, ToggleComponent } from "obsidian";
import StructuredTreePlugin from "./main";
import { VaultConfig } from "./engine/structuredVault";
import { AddVaultModal } from "./modal/folderSuggester";
import { ConfirmationModal } from "./modal/confirmationModal";
import { attachIconModal, structuredActivityBarName } from "./icons";

export interface StructuredTreePluginSettings {
  vaultPath?: string;
  vaultList: VaultConfig[];
  autoReveal: boolean;
  customResolver: boolean;
  customGraph: boolean;
  enableCanvasSupport: boolean;
  hierarchySeparator: string;
  autoGenerateFrontmatter: boolean;
  idKey: string;
  titleKey: string;
  descKey: string;
  createdKey: string;
  createdFormat: "yyyy-mm-dd" | "unix";
  generateTags: boolean;
  generateId: boolean;
  generateTitle: boolean;
  generateDesc: boolean;
  generateCreated: boolean;
  fuzzySearchFileNameWeight: number;
  fuzzySearchThreshold: number;
  excludedPaths: string[];
  pluginIcon: string
}

export const DEFAULT_SETTINGS: StructuredTreePluginSettings = {
  vaultList: [
    {
      name: "root",
      path: "/",
    },
  ],
  autoReveal: true,
  customResolver: false,
  customGraph: false,
  enableCanvasSupport: false,
  hierarchySeparator: ".",
  autoGenerateFrontmatter: true,
  generateTags: false,
  generateId: false,
  generateTitle: true,
  generateDesc: true,
  generateCreated: false,
  idKey: "id",
  titleKey: "title",
  descKey: "desc",
  createdKey: "created",
  createdFormat: "yyyy-mm-dd",
  fuzzySearchFileNameWeight: 0.6,
  fuzzySearchThreshold: 0.2,
  excludedPaths: [],
  pluginIcon: structuredActivityBarName
};

export const DENDRON_SETTINGS: Partial<StructuredTreePluginSettings> = {
  autoReveal: true,
  customResolver: true,
  customGraph: false,
  enableCanvasSupport: false,
  hierarchySeparator: ".",
  autoGenerateFrontmatter: true,
  generateTags: false,
  generateId: true,
  generateTitle: true,
  generateDesc: true,
  generateCreated: true,
  idKey: "id",
  titleKey: "title",
  descKey: "desc",
  createdKey: "created",
  createdFormat: "unix",
  excludedPaths: [],
};

export class StructuredTreeSettingTab extends PluginSettingTab {
  plugin: StructuredTreePlugin;

  constructor(app: App, plugin: StructuredTreePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
    .setName('Plugin Icon')
    .setDesc('Choose an icon for the plugin.')
    .addExtraButton(button => button
      .setDisabled(false)
      .setIcon(this.plugin.settings.pluginIcon)
      .setTooltip(this.plugin.settings.pluginIcon)
    )
    .addButton(button => button
      .setButtonText('Set Icon')
      .onClick(iconId => {
        attachIconModal(button, iconId => {
          if(!iconId) return;
          this.plugin.settings.pluginIcon = iconId
          this.plugin.saveSettings().then(() => {
            this.plugin.updateRibbonIcon()
            this.plugin.updateViewLeafIcon()
            this.display();
            this.updateIconSetButton(button)
          })
        })
      })
      .then(() => this.updateIconSetButton(button))
    )

    new Setting(containerEl)
      .setName("Auto Reveal")
      .setDesc("Automatically reveal active file in Structured Tree")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.autoReveal).onChange(async (value) => {
          this.plugin.settings.autoReveal = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Custom Resolver")
      .setDesc(
        "Use custom resolver to resolve ref/embed and link. (Please reopen or reload editor after changing)"
      )
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.customResolver).onChange(async (value) => {
          this.plugin.settings.customResolver = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Hierarchy Separator")
      .setDesc("Characters used to separate hierarchy levels. Max 2 characters.")
      .addText((text) => {
        text
          .setPlaceholder(".")
          .setValue(this.plugin.settings.hierarchySeparator)
          .onChange(async (value) => {
            const separator = value.slice(0, 2);
            this.plugin.settings.hierarchySeparator = separator;
            text.setValue(separator);
            await this.plugin.saveSettings();
          });
      });

    containerEl.createEl("h3", { text: "Properties" });

    let generateIdToggle: ToggleComponent;
    let generateTitleToggle: ToggleComponent;
    let generateDescToggle: ToggleComponent;
    let generateTagsToggle: ToggleComponent;
    let generateCreatedToggle: ToggleComponent;

    new Setting(containerEl)
      .setName("Auto-generate Properties")
      .setHeading()
      .setDesc("Generate properties for new files")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.autoGenerateFrontmatter).onChange(async (value) => {
          this.plugin.settings.autoGenerateFrontmatter = value;
          if (!value) {
            this.plugin.settings.generateId = false;
            this.plugin.settings.generateTags = false;
            generateIdToggle.setValue(false);
            generateTitleToggle.setValue(false);
            generateDescToggle.setValue(false);
            generateTagsToggle.setValue(false);
            generateCreatedToggle.setValue(false);
            generateCreatedToggle.setValue(false);
          }
          generateIdToggle.setDisabled(!value);
          generateTitleToggle.setDisabled(!value);
          generateTagsToggle.setDisabled(!value);
          generateTagsToggle.setDisabled(!value);
          generateDescToggle.setDisabled(!value);
          generateCreatedToggle.setDisabled(!value);
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("ID Property")
      .setDesc("Generate a 23 character long, unique alphanumeric ID for new files")
      .addToggle((toggle) => {
        generateIdToggle = toggle;
        toggle
          .setValue(this.plugin.settings.generateId)
          .setDisabled(!this.plugin.settings.autoGenerateFrontmatter)
          .onChange(async (value) => {
            this.plugin.settings.generateId = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Title Property")
      .setDesc("Generate a title property for new files")
      .addToggle((toggle) => {
        generateTitleToggle = toggle;
        toggle
          .setValue(this.plugin.settings.generateTitle)
          .setDisabled(!this.plugin.settings.autoGenerateFrontmatter)
          .onChange(async (value) => {
            this.plugin.settings.generateTitle = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Description Property")
      .setDesc("Generate a description property for new files")
      .addToggle((toggle) => {
        generateDescToggle = toggle;
        toggle
          .setValue(this.plugin.settings.generateDesc)
          .setDisabled(!this.plugin.settings.autoGenerateFrontmatter)
          .onChange(async (value) => {
            this.plugin.settings.generateDesc = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Created Date Property")
      .setDesc("Generate a property that stores the created date of the new file")
      .addToggle((toggle) => {
        generateCreatedToggle = toggle;
        toggle
          .setValue(this.plugin.settings.generateCreated)
          .setDisabled(!this.plugin.settings.autoGenerateFrontmatter)
          .onChange(async (value) => {
            this.plugin.settings.generateCreated = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Tag Property")
      .setDesc("Generate tag property for native Obsidian tags")
      .addToggle((toggle) => {
        generateTagsToggle = toggle;
        toggle
          .setValue(this.plugin.settings.generateTags)
          .setDisabled(!this.plugin.settings.autoGenerateFrontmatter)
          .onChange(async (value) => {
            this.plugin.settings.generateTags = value;
            await this.plugin.saveSettings();
          });
      });

    containerEl.createEl("h4", { text: "Property Keys" });

    new Setting(containerEl)
      .setName("ID Key")
      .setDesc("Property to use for the note ID")
      .addText((text) =>
        text
          .setPlaceholder("id")
          .setValue(this.plugin.settings.idKey)
          .onChange(async (value) => {
            this.plugin.settings.idKey = value.trim() || DEFAULT_SETTINGS.idKey;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Title Key")
      .setDesc("Property to use for the note title in the Tree and Lookup")
      .addText((text) =>
        text
          .setPlaceholder("title")
          .setValue(this.plugin.settings.titleKey)
          .onChange(async (value) => {
            this.plugin.settings.titleKey = value.trim() || DEFAULT_SETTINGS.titleKey;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Description Key")
      .setDesc("Property to use for note description in Lookup")
      .addText((text) =>
        text
          .setPlaceholder("desc")
          .setValue(this.plugin.settings.descKey)
          .onChange(async (value) => {
            this.plugin.settings.descKey = value.trim() || DEFAULT_SETTINGS.descKey;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Created Key")
      .setDesc("Property to use for note creation date")
      .addText((text) =>
        text
          .setPlaceholder("created")
          .setValue(this.plugin.settings.createdKey)
          .onChange(async (value) => {
            this.plugin.settings.createdKey = value.trim() || DEFAULT_SETTINGS.createdKey;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Created Date Format")
      .setDesc("Choose the format for the created date")
      .addDropdown((dropdown) => {
        dropdown
          .addOption("yyyy-mm-dd", "YYYY-MM-DD")
          .addOption("unix", "Unix (Milliseconds)")
          .setValue(this.plugin.settings.createdFormat)
          .onChange(async (value: "unix" | "yyyy-mm-dd") => {
            this.plugin.settings.createdFormat = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl).addButton((btn) =>
      btn.setButtonText("Reset Property Keys").onClick(async () => {
        const confirmed = await new Promise<boolean>((resolve) => {
          const modal = new ConfirmationModal(
            this.app,
            "Reset Property Keys",
            "This will reset all property keys to their default values. Are you sure you want to continue?",
            "Reset",
            "Cancel",
            (result) => resolve(result)
          );
          modal.open();
        });

        if (confirmed) {
          this.plugin.settings.idKey = DEFAULT_SETTINGS.idKey;
          this.plugin.settings.titleKey = DEFAULT_SETTINGS.titleKey;
          this.plugin.settings.descKey = DEFAULT_SETTINGS.descKey;
          this.plugin.settings.createdKey = DEFAULT_SETTINGS.createdKey;
          this.plugin.settings.createdFormat = DEFAULT_SETTINGS.createdFormat;
          await this.plugin.saveSettings();
          this.display();
          new Notice("Property keys have been reset to default values.");
        }
      })
    );

    containerEl.createEl("h3", { text: "Lookup Settings" });

    new Setting(containerEl)
      .setName("File Name Weight")
      .setDesc("How important is the file name when searching (0-1)")
      .addSlider((slider) =>
        slider
          .setLimits(0, 1, 0.1)
          .setValue(this.plugin.settings.fuzzySearchFileNameWeight)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.fuzzySearchFileNameWeight = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Search Threshold")
      .setDesc("How exact the match needs to be (0-1). Lower values require more exact matches")
      .addSlider((slider) =>
        slider
          .setLimits(0, 1, 0.1)
          .setValue(this.plugin.settings.fuzzySearchThreshold)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.fuzzySearchThreshold = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl).addButton((btn) =>
      btn.setButtonText("Reset Lookup Settings").onClick(async () => {
        const confirmed = await new Promise<boolean>((resolve) => {
          const modal = new ConfirmationModal(
            this.app,
            "Reset Lookup Settings",
            "This will reset file name weight and search threshold to their default values. Are you sure you want to continue?",
            "Reset",
            "Cancel",
            (result) => resolve(result)
          );
          modal.open();
        });

        if (confirmed) {
          this.plugin.settings.fuzzySearchFileNameWeight =
            DEFAULT_SETTINGS.fuzzySearchFileNameWeight;
          this.plugin.settings.fuzzySearchThreshold = DEFAULT_SETTINGS.fuzzySearchThreshold;
          await this.plugin.saveSettings();
          this.display();
          new Notice("Lookup settings have been reset.");
        }
      })
    );

    containerEl.createEl("h3", { text: "Excluded Paths" });

    new Setting(containerEl)
      .setName("Excluded Paths")
      .setDesc(
        "Paths that match these patterns will be less noticeable in lookup results. Use * as a wildcard."
      )
      .addTextArea((text) =>
        text
          .setPlaceholder("archive.*\nold/*")
          .setValue(this.plugin.settings.excludedPaths.join("\n"))
          .onChange(async (value) => {
            this.plugin.settings.excludedPaths = value
              .split("\n")
              .filter((line) => line.trim() !== "");
            await this.plugin.saveSettings();
          })
      );

    containerEl.createEl("h3", { text: "Vaults" });

    for (const vault of this.plugin.settings.vaultList) {
      new Setting(containerEl)
        .setName(vault.name)
        .setDesc(`Folder: ${vault.path}`)
        .addButton((btn) => {
          btn.setButtonText("Remove").onClick(async () => {
            this.plugin.settings.vaultList.remove(vault);
            await this.plugin.saveSettings();
            this.display();
          });
        });
    }
    new Setting(containerEl).addButton((btn) => {
      btn.setButtonText("Add Vault").onClick(() => {
        new AddVaultModal(this.app, (config) => {
          const list = this.plugin.settings.vaultList;
          const nameLowecase = config.name.toLowerCase();
          if (list.find(({ name }) => name.toLowerCase() === nameLowecase)) {
            new Notice("Vault with same name already exist");
            return false;
          }
          if (list.find(({ path }) => path === config.path)) {
            new Notice("Vault with same path already exist");
            return false;
          }

          list.push(config);
          this.plugin.saveSettings().then(() => this.display());
          return true;
        }).open();
      });
    });

    containerEl.createEl("h3", { text: "Experimental Features" });
    containerEl.createEl("p", {
      text: "These features are not completed yet. Expect bugs if you use them.",
    });

    new Setting(containerEl)
      .setName("Enable Canvas Support")
      .setDesc("Enable support for displaying .canvas files in the tree")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.enableCanvasSupport).onChange(async (value) => {
          this.plugin.settings.enableCanvasSupport = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Custom Graph Engine")
      .setDesc(
        "Use custom graph engine to render graph. (Please reopen or reload editor after changing)"
      )
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.customGraph).onChange(async (value) => {
          this.plugin.settings.customGraph = value;
          await this.plugin.saveSettings();
        });
      });

    containerEl.createEl("h3", { text: "Miscellaneous" });

    new Setting(containerEl)
      .setName("Dendron Compatibility")
      .setHeading()
      .setDesc("Change all relevant settings to keep compatibility with Dendron")
      .addButton((btn) =>
        btn.setButtonText("Apply Dendron Settings").onClick(async () => {
          const confirmed = await new Promise<boolean>((resolve) => {
            const modal = new ConfirmationModal(
              this.app,
              "Apply Dendron Compatibility Settings",
              "This will overwrite your current settings to maintain compatibility with Dendron. Are you sure you want to continue?",
              "Apply",
              "Cancel",
              (result) => resolve(result)
            );
            modal.open();
          });

          if (confirmed) {
            this.plugin.settings = {
              ...this.plugin.settings,
              ...DENDRON_SETTINGS,
            };

            await this.plugin.saveSettings();
            this.display();
            new Notice("Dendron compatibility settings applied.");
          }
        })
      );
  }
  hide() {
    super.hide();
    this.plugin.onRootFolderChanged();
    this.plugin.configureCustomResolver();
    this.plugin.configureCustomGraph();
  }
  
  updateIconSetButton(button: ButtonComponent) {
    if(this.plugin.settings.pluginIcon == DEFAULT_SETTINGS.pluginIcon) {
      return;
    }
  
    button
      .setButtonText('Reset Icon')
      .onClick(() => {
        this.plugin.settings.pluginIcon = DEFAULT_SETTINGS.pluginIcon
        this.plugin.saveSettings().then(() => {
          this.plugin.updateRibbonIcon();
          this.plugin.updateViewLeafIcon()
          this.display()
        })
      })
  }
}
