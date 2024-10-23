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
  sortKey: string;

  constructor(
    private originalName: string,
    private titlecase: boolean,
    private settings: StructuredTreePluginSettings
  ) {
    this.name = originalName.toLowerCase();
    this.syncMetadata(undefined);
    this.sortKey = this.title.toLowerCase();
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

  sortChildren(recursive: boolean) {
    this.children.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    if (recursive) this.children.forEach((child) => child.sortChildren(recursive));
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
    } else {
      this.metadata[this.settings.titleKey] = String(this.metadata[this.settings.titleKey]);
    }
    if (this.metadata[this.settings.descKey] === undefined) {
      this.metadata[this.settings.descKey] = "";
    }
    this.updateSortKey();
  }

  updateSortKey() {
    this.sortKey = this.title.toLowerCase();
  }

  get title(): string {
    return String(this.metadata[this.settings.titleKey] || this.name);
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
