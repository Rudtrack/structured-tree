import { App, Modal, Setting, TFile, ButtonComponent } from "obsidian";

export class RenameNoteModal extends Modal {
  private newNameInput: HTMLInputElement;
  private renameButton: ButtonComponent;
  private errorMessageEl: HTMLParagraphElement;

  constructor(
    app: App,
    private file: TFile,
    private onRename: (newName: string) => Promise<void>
  ) {
    super(app);
    this.modalEl.addClass("structured-rename-modal");
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.addClass("structured-rename-modal");

    contentEl.createEl("h2", { text: "Rename Note" });
    contentEl.createEl("h5", { text: `${this.file.basename}` });

    const inputContainer = contentEl.createDiv("structured-rename-input-container");

    this.newNameInput = inputContainer.createEl("input", {
      type: "text",
      value: this.file.basename,
      cls: "structured-rename-input",
      attr: { spellcheck: "false" },
    });

    setTimeout(() => {
      this.newNameInput.focus();
      this.newNameInput.setSelectionRange(
        this.newNameInput.value.length,
        this.newNameInput.value.length
      );
    }, 0);

    this.newNameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        this.rename();
      }
    });

    this.errorMessageEl = contentEl.createEl("p", {
      cls: "structured-rename-error",
      text: "",
    });

    new Setting(contentEl).addButton((btn) => {
      this.renameButton = btn
        .setButtonText("Rename")
        .setCta()
        .onClick(() => this.rename());
    });
  }

  private async rename() {
    const newName = this.newNameInput.value;
    if (newName && newName !== this.file.basename) {
      if (await this.fileExists(newName)) {
        this.showError(`A file named "${newName}" already exists.`);
      } else {
        try {
          await this.onRename(newName);
          this.close();
        } catch (error) {
          this.showError(`Failed to rename: ${error.message}`);
        }
      }
    }
  }

  private async fileExists(fileName: string): Promise<boolean> {
    const newPath = this.file.path.replace(this.file.name, fileName);
    return await this.app.vault.adapter.exists(newPath);
  }

  private showError(message: string) {
    this.errorMessageEl.setText(message);
    this.errorMessageEl.style.display = "block";
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
