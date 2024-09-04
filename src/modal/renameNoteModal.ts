import { App, Modal, Setting, TFile, ButtonComponent } from "obsidian";

export class RenameNoteModal extends Modal {
  private newNameInput: HTMLInputElement;
  private renameButton: ButtonComponent;

  constructor(
    app: App,
    private file: TFile,
    private onRename: (newName: string) => Promise<void>
  ) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl("h2", { text: "Rename note and its children" });

    new Setting(contentEl)
      .setName("New name")
      .addText((text) => {
        this.newNameInput = text
          .setValue(this.file.basename)
          .inputEl;
        
        this.newNameInput.focus();
        this.newNameInput.select();
        
        // Add event listener for Enter key
        this.newNameInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            this.rename();
          }
        });
      });

    new Setting(contentEl)
      .addButton((btn) => {
        this.renameButton = btn
          .setButtonText("Rename")
          .setCta()
          .onClick(() => this.rename());
      });
  }

  private async rename() {
    const newName = this.newNameInput.value;
    if (newName && newName !== this.file.basename) {
      await this.onRename(newName);
      this.close();
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
