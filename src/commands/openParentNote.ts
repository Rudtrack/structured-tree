import { App, Notice, TFile } from "obsidian";
import { StructuredWorkspace } from "../engine/structuredWorkspace";
import { Note } from "../engine/note";

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

  // If the note has no parent, this is a root note and there's nothing to open
  if (!note.parent) {
    new Notice("This is a root note");
    return;
  }

  // Traverse up the ancestor chain until we find a node with a file (including root)
  let ancestor: Note | undefined = note.parent;
  while (ancestor) {
    if (ancestor.file instanceof TFile) {
      const leaf = app.workspace.getLeaf();
      await leaf.openFile(ancestor.file);
      return;
    }

    if (ancestor === vault.tree.root) {
      // Reached the root and no file was found
      break;
    }

    ancestor = ancestor.parent;
  }

  new Notice("No parent note file found in hierarchy");
}