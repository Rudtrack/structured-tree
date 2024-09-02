import { TFile } from "obsidian";
import { StructuredTreePluginSettings } from "../settings";

export interface NoteMetadata {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export class Note {
  name: string;
  children: Note[] = [];
  file?: TFile;
  parent?: Note;
  metadata: NoteMetadata = {};

  constructor(
    private originalName: string,
    private titlecase: boolean,
    private settings: StructuredTreePluginSettings
  ) {
    this.name = originalName.toLowerCase();
    this.syncMetadata(undefined);
  }

  appendChild(note: Note) {
    if (note.parent) throw Error("Note has parent");
    note.parent = this;
    this.children.push(note);
  }

  removeChildren(note: Note) {
    note.parent = undefined;
    const index = this.children.indexOf(note);
    this.children.splice(index, 1);
  }

  findChildren(name: string) {
    const lower = name.toLowerCase();
    return this.children.find((note) => note.name == lower);
  }

  sortChildren(rescursive: boolean) {
    this.children.sort((a, b) => a.title.localeCompare(b.title));
    if (rescursive) this.children.forEach((child) => child.sortChildren(rescursive));
  }

  getPath(original = false) {
    const component: string[] = [];
    const notes = this.getPathNotes();

    if (notes.length === 1) return original ? notes[0].originalName : notes[0].name;

    for (const note of notes) {
      if (!note.parent && note.name === "root") continue;
      component.push(original ? note.originalName : note.name);
    }

    return component.join(".");
  }

  getPathNotes() {
    const notes: Note[] = [];
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let current: Note | undefined = this;
    while (current) {
      notes.unshift(current);
      current = current.parent;
    }
    return notes;
  }

  syncMetadata(metadata: NoteMetadata | undefined) {
    this.metadata = metadata || {};
    if (!this.metadata[this.settings.titleKey]) {
      this.metadata[this.settings.titleKey] = generateNoteTitle(this.originalName, this.titlecase);
    }
    if (this.metadata[this.settings.descKey] === undefined) {
      this.metadata[this.settings.descKey] = "";
    }
  }

  get title(): string {
    return this.metadata[this.settings.titleKey] || this.name;
  }

  get desc(): string {
    return this.metadata[this.settings.descKey] || "";
  }
}

/**
 * Check whetever generated note title must be title case or not
 * @param baseName file base name
 */

export function isUseTitleCase(baseName: string) {
  return baseName.toLowerCase() === baseName;
}

/**
 * Generate title for note
 * @param originalName name of note before lowercased (not filename)
 * @param titlecase use title case or use original name
 * @returns title for note
 */

export function generateNoteTitle(originalName: string, titlecase: boolean) {
  if (!titlecase) return originalName;
  return originalName
    .split("-")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .map((word) => {
      return word[0].toUpperCase() + word.substring(1).toLowerCase();
    })
    .join(" ");
}

export class NoteTree {
  root: Note;

  constructor(settings: StructuredTreePluginSettings) {
    this.root = new Note("root", true, settings);
  }

  sort() {
    this.root.sortChildren(true);
  }

  public static getPathFromFileName(name: string) {
    return name.split(".");
  }

  private static isRootPath(path: string[]) {
    return path.length === 1 && path[0] === "root";
  }

  addFile(file: TFile, settings: StructuredTreePluginSettings, sort = false) {
    const titlecase = isUseTitleCase(file.basename);
    const path = NoteTree.getPathFromFileName(file.basename);

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

    currentNote.file = file;
    return currentNote;
  }

  getFromFileName(name: string) {
    const path = NoteTree.getPathFromFileName(name);

    if (NoteTree.isRootPath(path)) return this.root;

    let currentNote: Note = this.root;

    for (const name of path) {
      const found = currentNote.findChildren(name);
      if (!found) return undefined;
      currentNote = found;
    }

    return currentNote;
  }

  deleteByFileName(name: string) {
    const note = this.getFromFileName(name);
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
