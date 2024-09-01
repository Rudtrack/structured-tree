import { App, TAbstractFile, TFile, TFolder } from "obsidian";
import { NoteMetadata, NoteTree } from "./note";
import { InvalidRootModal } from "../modal/invalid-root";
import { generateUUID, getFolderFile } from "../utils";
import { ParsedPath } from "../path";
import { StructuredTreePluginSettings } from "../settings";

export interface VaultConfig {
  path: string;
  name: string;
}

export class StructuredVault {
  folder: TFolder;
  tree: NoteTree;
  isIniatialized = false;

  constructor(
    public app: App, 
    public config: VaultConfig,
    private settings: StructuredTreePluginSettings
  ) {}

  public resolveMetadata(file: TFile): NoteMetadata | undefined {
    const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
    if (!frontmatter) return undefined;
    return {
      title: frontmatter[this.settings.titleKey],
      desc: frontmatter[this.settings.descKey]
    };
  }

  init() {
    if (this.isIniatialized) return;

    this.tree = new NoteTree();

    const root = getFolderFile(this.app.vault, this.config.path);
    if (!(root instanceof TFolder)) {
      new InvalidRootModal(this).open();
      return;
    }

    this.folder = root;

    for (const child of root.children)
      if (child instanceof TFile && this.isNote(child.extension))
        this.tree.addFile(child).syncMetadata(this.resolveMetadata(child));

    this.tree.sort();
    this.isIniatialized = true;
  }

  async createRootFolder() {
    return await this.app.vault.createFolder(this.config.path);
  }

  async createNote(baseName: string) {
    const filePath = `${this.config.path}/${baseName}.md`;
    return await this.app.vault.create(filePath, "");
  }
  

  async generateFrontmatter(file: TFile) {
    if (!this.isNote(file.extension)) return;
  
    const note = this.tree.getFromFileName(file.basename);
  
    if (!note) return false;
  
    return await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
      if (!frontmatter.id) frontmatter.id = generateUUID();
      if (!frontmatter[this.settings.titleKey]) frontmatter[this.settings.titleKey] = note.title;
      if (frontmatter[this.settings.descKey] === undefined) frontmatter[this.settings.descKey] = note.desc;
      if (!frontmatter.created) frontmatter.created = file.stat.ctime;
      if (!frontmatter.updated) frontmatter.updated = file.stat.mtime;
    });
  }

  acceptedExtensions = new Set([
    "md", "canvas", 
    "pdf", 
    "avif", "bmp", "gif", "jpeg", "jpg", "png", "svg",
    "flac", "m4a", "mp3", "ogg", "wav", "webm", "3gp",
    "mkv", "mov", "mp4", "ogv", "webm"
  ]);
  
  isNote(extension: string) {
    return this.acceptedExtensions.has(extension);
  }
  
  onFileCreated(file: TAbstractFile): boolean {
    if (!(file instanceof TFile) || !this.isNote(file.extension)) return false;

    this.tree.addFile(file, true).syncMetadata(this.resolveMetadata(file));
    return true;
  }

  onMetadataChanged(file: TFile): boolean {
    if (!this.isNote(file.extension)) return false;

    const note = this.tree.getFromFileName(file.basename);
    if (!note) return false;

    note.syncMetadata(this.resolveMetadata(file));
    note.parent?.sortChildren(false);
    return true;
  }

  onFileDeleted(parsed: ParsedPath): boolean {
    if (!this.isNote(parsed.extension)) return false;

    const note = this.tree.deleteByFileName(parsed.basename);
    if (note?.parent) {
      note.syncMetadata(undefined);
    }
    return true;
  }
}
