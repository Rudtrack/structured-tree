import { App, TFile } from "obsidian";
import { NoteFinder } from "./noteFinder";
import { NoteTree } from "./noteTree";
import * as path from 'path';

export class NoteRenamer {
  constructor(
    private app: App,
    private finder: NoteFinder,
    private noteTree: NoteTree
  ) {}

  async renameNote(file: TFile, newName: string) {
    const dirPath = path.dirname(file.path);
    const newBasePath = newName;
    const children = this.finder.findChildren(file);
    const newNotesNames = children.map((f) => {
      const childFileName = path.basename(f.path);
      const newChildName = childFileName.replace(file.basename, newBasePath);
      return {
        file: f,
        newPath: path.join(dirPath, newChildName),
      };
    });
    for (const f of newNotesNames) {
      await this.app.fileManager.renameFile(f.file, f.newPath);
    }
    
    const newPath = path.join(dirPath, newBasePath + path.extname(file.path));
    await this.app.fileManager.renameFile(file, newPath);
    
    const note = this.noteTree.getFromFileName(file.basename);
    if (note) {
      const newFile = this.app.vault.getAbstractFileByPath(newPath) as TFile;
      if (newFile) {
        this.noteTree.updateNoteFile(note, newFile);
      }
    }
  }
}
