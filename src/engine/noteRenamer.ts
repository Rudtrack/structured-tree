import { App, TFile } from "obsidian";
import { NoteFinder } from "./noteFinder";
import { NoteTree } from "./noteTree";

export class NoteRenamer {
  constructor(
    private app: App,
    private finder: NoteFinder,
    private noteTree: NoteTree
  ) {}

  async renameNote(file: TFile, newName: string) {
    const newBasePath = file.basename.replace(file.basename, newName);
    const children = this.finder.findChildren(file);
    const newNotesNames = children.map((f) => {
      return {
        file: f,
        newPath: f.path.replace(file.basename, newBasePath),
      };
    });
    for (const f of newNotesNames) {
      await this.app.fileManager.renameFile(f.file, f.newPath);
    }
    
    const newPath = file.path.replace(file.basename, newBasePath);
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
