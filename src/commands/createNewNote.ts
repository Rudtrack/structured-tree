import { App } from "obsidian";
import { LookupModal } from "../modal/lookup/lookupModal";
import { StructuredWorkspace } from "../engine/structuredWorkspace";
import { StructuredVault } from "../engine/structuredVault";

export function createNewNoteCommand(app: App, workspace: StructuredWorkspace) {
  return {
    id: "structured-tree-create-note",
    name: "Create New Note",
    callback: () => openLookupWithCurrentPath(app, workspace),
  };
}

export function openLookupWithCurrentPath(
  app: App, 
  workspace: StructuredWorkspace, 
  initialPath?: string,
  sourceVault?: StructuredVault
) {
  let path = initialPath;
  
  if (!path) {
    const activeFile = app.workspace.getActiveFile();
    if (activeFile) {
      const activeVault = workspace.findVaultByParent(activeFile.parent);
      if (activeVault) {
        const note = activeVault.tree.getFromFileName(activeFile.basename, workspace.settings);
        if (note) {
          path = note.getPath(true) + ".";
        }
      }
    }
  }

  if (!sourceVault) {
    const activeFile = app.workspace.getActiveFile();
    if (activeFile) {
      sourceVault = workspace.findVaultByParent(activeFile.parent);
    }
  }

  const modal = new LookupModal(
    app,
    workspace,
    path,
    sourceVault ? async (inputValue) => {
      if (sourceVault) {
        const vault = sourceVault;
        const file = await vault.createNote(inputValue);
        if (file) app.workspace.getLeaf().openFile(file);
      }
    } : undefined
  );
  modal.open();
}