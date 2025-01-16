import { App } from "obsidian";
import { LookupModal } from "../modal/lookup/lookupModal";
import { StructuredWorkspace } from "../engine/structuredWorkspace";

export function createNewNoteCommand(app: App, workspace: StructuredWorkspace) {
  return {
    id: "structured-tree-create-note",
    name: "Create New Note",
    callback: () => openLookupWithCurrentPath(app, workspace),
  };
}

export function openLookupWithCurrentPath(app: App, workspace: StructuredWorkspace, initialPath?: string) {
  if (!initialPath) {
    const activeFile = app.workspace.getActiveFile();
    if (activeFile) {
      const vault = workspace.findVaultByParent(activeFile.parent);
      if (vault) {
        const note = vault.tree.getFromFileName(activeFile.basename, this.settings);
        if (note) {
          initialPath = note.getPath(true) + ".";
        }
      }
    }
  }

  new LookupModal(app, workspace, initialPath).open();
}
