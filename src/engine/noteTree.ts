import { StructuredTreePluginSettings } from "src/settings";
import { isUseTitleCase, Note } from "./note";
import { TFile } from "obsidian";

export class NoteTree {
  root: Note;

  constructor(settings: StructuredTreePluginSettings) {
    this.root = new Note("root", true, settings);
  }

  sort() {
    this.root.sortChildren(true);
  }

  public static getPathFromFileName(name: string, separator: string) {
    return name.split(separator || ".");
  }

  private static isRootPath(path: string[]) {
    return path.length === 1 && path[0] === "root";
  }

  addFile(file: TFile, settings: StructuredTreePluginSettings, sort = false) {
    const titlecase = isUseTitleCase(file.basename);
    const path = NoteTree.getPathFromFileName(file.basename, settings.hierarchySeparator);

    let currentNote: Note = this.root;

    if (!NoteTree.isRootPath(path))
      for (const name of path) {
        let note: Note | undefined = currentNote.findChildren(name);

        if (!note) {
          note = new Note(name, titlecase, settings);
          currentNote.appendChild(note);
          if (sort) currentNote.sortChildren(false);
        }

        currentNote = note;
      }

    this.updateNoteFile(currentNote, file);
    return currentNote;
  }

  updateNoteFile(note: Note, file: TFile) {
    note.file = file;
    // If the note has a title, use it for sorting instead of the file name
    if (note.title) {
      note.sortKey = note.title.toLowerCase();
    } else {
      note.sortKey = file.basename.toLowerCase();
    }
    
    // Re-sort the parent to ensure correct positioning
    if (note.parent) {
      note.parent.sortChildren(false);
    }
  }

  getFromFileName(name: string, settings: StructuredTreePluginSettings) {
    const path = NoteTree.getPathFromFileName(name, settings.hierarchySeparator);

    if (NoteTree.isRootPath(path)) return this.root;

    let currentNote: Note = this.root;

    for (const name of path) {
      const found = currentNote.findChildren(name);
      if (!found) return undefined;
      currentNote = found;
    }

    return currentNote;
  }

  deleteByFileName(name: string, settings: StructuredTreePluginSettings) {
    const note = this.getFromFileName(name, settings);
    if (!note) return;

    note.file = undefined;
    if (note.children.length == 0) {
      let currentNote: Note | undefined = note;
      while (
        currentNote &&
        currentNote.parent &&
        !currentNote.file &&
        currentNote.children.length == 0
      ) {
        const parent: Note | undefined = currentNote.parent;
        parent.removeChildren(currentNote);
        currentNote = parent;
      }
    }

    return note;
  }

  private static *flattenInternal(root: Note): Generator<Note> {
    yield root;
    for (const child of root.children) yield* this.flattenInternal(child);
  }

  flatten() {
    return Array.from(NoteTree.flattenInternal(this.root));
  }
}
