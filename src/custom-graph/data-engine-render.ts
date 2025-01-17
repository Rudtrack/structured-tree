import { App, GraphEngine, TFile } from "obsidian";
import { Note } from "src/engine/note";
import { StructuredVault } from "src/engine/structuredVault";
import { StructuredWorkspace } from "src/engine/structuredWorkspace";
import { isLocalGraphView } from "./utils";
import { StructuredTreePluginSettings } from "src/settings";

type StructuredGraphNode = {
  file: TFile;
} & (
  | {
      type: "note";
      vault: StructuredVault;
      note: Note;
    }
  | {
      type: "file";
    }
);

function getGlobalNodes(
  app: App,
  workspace: StructuredWorkspace,
  options: GraphEngine["options"],
  filterFile: (file: string, type: string) => boolean,
  progression: number
) {
  const nodes: Record<string, any> = {};
  let numLinks = 0;

  const structuredNodeList: StructuredGraphNode[] = workspace.vaultList.flatMap((vault) =>
    vault.tree
      .flatten()
      .filter((note) => note.file)
      .map((note) => ({
        type: "note",
        vault,
        file: note.file!,
        note,
      }))
  );

  if (options.showAttachments)
    structuredNodeList.push(
      ...app.vault
        .getFiles()
        .filter((file) =>
          file.extension === "md" && file.parent ? !workspace.findVaultByParent(file.parent) : true
        )
        .map((file) => ({
          type: "file" as const,
          file,
        }))
    );

  if (progression) {
    const map = new Map<StructuredGraphNode, number>();
    for (const structuredNode of structuredNodeList) {
      if (structuredNode.type === "file") {
        map.set(
          structuredNode,
          Math.min(structuredNode.file.stat.ctime, structuredNode.file.stat.mtime)
        );
        continue;
      } else if (structuredNode.type === "note") {
        const file = structuredNode.note.file;
        if (!file) {
          map.set(structuredNode, Infinity);
        } else {
          const metadata = app.metadataCache.getFileCache(file)?.frontmatter;

          if (!metadata) map.set(structuredNode, Infinity);
          else {
            const created = parseInt(metadata["created"]);
            map.set(structuredNode, isNaN(created) ? Infinity : created);
          }
        }
      }
    }
    structuredNodeList.sort((a, b) => map.get(a)! - map.get(b)!);
  }

  let stopFile: TFile | undefined = undefined;
  for (const structuredNode of structuredNodeList) {
    if (structuredNode.type === "note") {
      const { note, vault } = structuredNode;
      if (!filterFile(note.file?.path ?? "", "")) continue;

      const node: any = {
        type: "",
        links: {},
      };
      nodes[`structured://${vault.config.name}/${note.getPath()}`] = node;

      if (options.showOrphans) {
        if (progression && progression === numLinks) {
          stopFile = note.file;
        }
        numLinks++;
      }

      if (!note.file) continue;
      const meta = app.metadataCache.getFileCache(note.file);
      if (!meta) continue;

      const listOfLinks = (meta.links ?? []).concat(meta.embeds ?? []);

      for (const link of listOfLinks) {
        const href = link.original.startsWith("[[")
          ? link.original.substring(2, link.original.length - 2).split("|", 2)[0]
          : link.link;
        const target = workspace.resolveRef(note.file.path, href);
        if (target?.type === "maybe-note") {
          const linkName = `structured://${target.vaultName}/${target.path}`.toLowerCase();
          if (!progression || numLinks < progression) {
            if (!target.note?.file) {
              if (!filterFile(target.note?.file?.path ?? "", "unresolved")) continue;
              if (options.hideUnresolved) continue;
              nodes[linkName] = {
                type: "unresolved",
                links: {},
              };
            } else {
              if (!filterFile(target.note?.file?.path ?? "", "")) continue;
            }

            node.links[linkName] = true;
          }

          if (progression && progression === numLinks) {
            stopFile = note.file;
          }

          numLinks++;
        } else if (target && options.showAttachments) {
          if (!progression || numLinks < progression) {
            const linkName = target.file.path;
            node.links[linkName] = true;
          }

          if (progression && progression === numLinks) {
            stopFile = note.file;
          }

          numLinks++;
        }
      }
    } else if (structuredNode.type === "file") {
      const linkName = structuredNode.file.path;
      if (options.showOrphans) {
        if (progression && progression === numLinks) {
          stopFile = structuredNode.file;
        }
        numLinks++;
      }

      const node: any = {
        type: "attachment",
        links: {},
      };

      if (!filterFile(linkName, "attachment")) continue;
      nodes[linkName] = node;
    }
  }
  if (progression) {
    const index = structuredNodeList.findIndex(({ file }) => file === stopFile);

    if (index >= 0) {
      for (let i = index + 1; i < structuredNodeList.length; i++) {
        const structuredNode = structuredNodeList[i];

        const p =
          structuredNode.type === "note"
            ? `structured://${structuredNode.vault.config.name}/${structuredNode.note.getPath()}`
            : structuredNode.file.path;
        if (!nodes[p]) {
          console.log(`Delete failed ${p}`);
        }
        delete nodes[p];
      }
    }
  }

  return {
    nodes,
    numLinks,
  };
}

function getLocalNodes(
  app: App,
  workspace: StructuredWorkspace,
  options: GraphEngine["options"],
  globalNodes: ReturnType<typeof getGlobalNodes>["nodes"],
  settings: StructuredTreePluginSettings
) {
  const localNodes: Record<string, any> = {};
  const localWeights: Record<string, number> = {};
  const result = {
    nodes: localNodes,
    weights: localWeights,
  };

  const file = app.vault.getAbstractFileByPath(options.localFile);

  if (!(file instanceof TFile) || !file.parent) {
    console.log("error");
    return result;
  }

  const vault = workspace.findVaultByParent(file.parent);

  if (!vault) {
    console.log("error vault not found");
    return result;
  }

  const localFileDPath = `structured://${vault.config.name}/${file.basename}`;

  localWeights[localFileDPath] = 30;
  if (!globalNodes[localFileDPath]) {
    localNodes[localFileDPath] = {
      links: {},
      type: "",
    };
    return result;
  }

  localNodes[localFileDPath] = {
    links: {},
    type: globalNodes[localFileDPath].type,
  };

  function isDirectlyRelated(note1: Note, note2: Note): boolean {
    return note1.parent === note2 || note2.parent === note1;
  }

  function addNode(nodePath: string) {
    if (!localNodes[nodePath] && globalNodes[nodePath]) {
      localNodes[nodePath] = {
        links: {},
        type: globalNodes[nodePath].type,
      };
      localWeights[nodePath] = 15; // Adjust weight as needed
    }
  }

  const currentNote = vault.tree.getFromFileName(file.basename, settings);
  if (!currentNote) return result;

  const isTopLevel = currentNote.parent === vault.tree.root;

  // Add root node only if the current file is top-level
  if (isTopLevel) {
    const rootPath = `structured://${vault.config.name}/${vault.tree.root.getPath()}`;
    addNode(rootPath);
    localWeights[rootPath] = 20; // Adjust weight as needed
    localNodes[rootPath].links[localFileDPath] = true;
    localNodes[localFileDPath].links[rootPath] = true;
  }

  // Add nodes and create links
  vault.tree.flatten().forEach((note) => {
    if (!note.file) return; // Skip notes without files

    const notePath = `structured://${vault.config.name}/${note.getPath()}`;

    if (isDirectlyRelated(currentNote, note)) {
      addNode(notePath);
      localNodes[localFileDPath].links[notePath] = true;
      localNodes[notePath].links[localFileDPath] = true;
    }

    // Connect siblings if the current file is top-level
    if (isTopLevel && note.parent === vault.tree.root && note !== currentNote) {
      addNode(notePath);
      localNodes[localFileDPath].links[notePath] = true;
      localNodes[notePath].links[localFileDPath] = true;
    }
  });

  return result;
}

export function createDataEngineRender(
  app: App,
  workspace: StructuredWorkspace
): GraphEngine["render"] {
  return function (this: GraphEngine) {
    const isLocalGraph = isLocalGraphView(this.view);

    // Always use custom graph logic
    const filterFile = (file: string, nodeType: string) => {
      if (!this.searchQueries) {
        return true;
      }
      if ("" === nodeType) {
        return this.fileFilter.hasOwnProperty(file) ? this.fileFilter[file] : !this.hasFilter;
      }
      if ("attachment" !== nodeType) return true;
      return this.searchQueries.every(function (query) {
        return !!query.color || !!query.query.matchFilepath(file);
      });
    };

    if (isLocalGraph) {
      this.progression = 0;
    }

    let data: any = getGlobalNodes(app, workspace, this.options, filterFile, this.progression);
    const { nodes, numLinks } = data;

    if (isLocalGraph && this.options.localFile) {
      data = getLocalNodes(app, workspace, this.options, nodes, workspace.settings);
    }

    if (!this.options.showOrphans) {
      const isNodeReferenced = new Map<string, boolean>();

      for (const nodeName of Object.keys(nodes)) {
        for (const link of Object.keys(nodes[nodeName].links)) {
          if (link === nodeName) continue;
          isNodeReferenced.set(link, true);
        }
      }

      for (const nodeName of Object.keys(nodes)) {
        if (isNodeReferenced.get(nodeName)) continue;

        let canDelete = true;
        for (const link of Object.keys(nodes[nodeName].links)) {
          if (link === nodeName) continue;
          canDelete = false;
          break;
        }

        if (canDelete) delete nodes[nodeName];
      }
    }
    this.renderer.setData(data);
    return numLinks;
  };
}
