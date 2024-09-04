import { App, Modal, Setting, TFile } from "obsidian";

export class RenameNoteModal extends Modal {
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
      .addText((text) =>
        text
          .setValue(this.file.basename)
          .onChange(async (value) => {
            if (value && value !== this.file.basename) {
              await this.onRename(value);
              this.close();
            }
          })
      );
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
