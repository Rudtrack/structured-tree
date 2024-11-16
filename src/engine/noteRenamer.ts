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
    const dirPath = file.parent?.path || "";
    const newBasePath = newName;
    const children = this.finder.findChildren(file);
    const newNotesNames = children.map((f) => {
      const childFileName = f.name;
      const newChildName = childFileName.replace(file.basename, newBasePath);
      return {
        file: f,
        newPath: dirPath ? `${dirPath}/${newChildName}` : newChildName,
      };
    });
    
    for (const f of newNotesNames) {
      await this.app.fileManager.renameFile(f.file, f.newPath);
    }
    
    const extension = file.extension ? `.${file.extension}` : "";
    const newPath = dirPath ? `${dirPath}/${newBasePath}${extension}` : `${newBasePath}${extension}`;
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