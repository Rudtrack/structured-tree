import { App, Notice } from "obsidian";
import { StructuredWorkspace } from "../engine/structuredWorkspace";
import { RenameNoteModal } from "../modal/renameNoteModal";

export function renameNoteCommand(
  app: App,
  workspace: StructuredWorkspace,
  updateNoteStore: () => void
) {
  return {
    id: "rename-structured-note",
    name: "Rename note",
    callback: () => renameCurrentNote(app, workspace, updateNoteStore),
  };
}

async function renameCurrentNote(
  app: App,
  workspace: StructuredWorkspace,
  updateNoteStore: () => void
) {
  const activeFile = app.workspace.getActiveFile();
  if (activeFile) {
    const vault = workspace.findVaultByParent(activeFile.parent);
    if (vault) {
      new RenameNoteModal(app, activeFile, async (newName) => {
        await vault.noteRenamer.renameNote(activeFile, newName);
        updateNoteStore();
      }).open();
    }
  } else {
    new Notice("No active file");
  }
}
