import { App, Notice, TFile } from "obsidian";
import { StructuredWorkspace } from "../engine/structuredWorkspace";

export function openParentNoteCommand(app: App, workspace: StructuredWorkspace) {
  return {
    id: "open-parent-note",
    name: "Open parent note",
    callback: () => openParentNote(app, workspace),
  };
}

async function openParentNote(app: App, workspace: StructuredWorkspace) {
  const activeFile = app.workspace.getActiveFile();
  if (!activeFile) {
    new Notice("No active file");
    return;
  }

  const vault = workspace.findVaultByParent(activeFile.parent);
  if (!vault) {
    new Notice("File is not in a structured vault");
    return;
  }

  const note = vault.tree.getFromFileName(activeFile.basename, workspace.settings);
  if (!note) {
    new Notice("Cannot find note in structured tree");
    return;
  }

  const parentNote = note.parent;
  if (!parentNote || parentNote === vault.tree.root) {
    new Notice("This is a root note");
    return;
  }

  if (parentNote.file instanceof TFile) {
    const leaf = app.workspace.getLeaf();
    await leaf.openFile(parentNote.file);
  } else {
    new Notice("Parent note file not found");
  }
}
