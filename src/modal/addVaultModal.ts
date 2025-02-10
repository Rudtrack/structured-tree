import { App, Modal, Notice, Setting, TFolder, TextComponent } from "obsidian";
import { VaultConfig } from "../engine/structuredVault";
import { FolderSuggester } from "./folderSuggester";

export class AddVaultModal extends Modal {
  folder?: TFolder;
  nameText: TextComponent;
  isSecret: boolean = false;

  constructor(
    app: App,
    public onSubmit: (config: VaultConfig) => boolean,
    existingVault?: VaultConfig
  ) {
    super(app);
    if (existingVault) {
      this.isSecret = existingVault.isSecret || false;
      this.folder = app.vault.getAbstractFileByPath(existingVault.path) as TFolder;
    }
  }

  private generateName({ path, name }: TFolder) {
    if (path === "/") return "root";
    return name;
  }

  onOpen(): void {
    new Setting(this.contentEl).setHeading().setName(this.folder ? "Edit Vault" : "Add Vault");

    new Setting(this.contentEl).setName("Vault Path").addText((text) => {
      if (this.folder) {
        text.setValue(this.folder.path);
      }
      new FolderSuggester(this.app, text.inputEl, (newFolder) => {
        const currentName = this.nameText.getValue();
        if (
          currentName.length === 0 ||
          (this.folder && currentName === this.generateName(this.folder))
        )
          this.nameText.setValue(this.generateName(newFolder));

        this.folder = newFolder;
      });
    });

    // Name setting
    new Setting(this.contentEl).setName("Vault Name").addText((text) => {
      this.nameText = text;
      if (this.folder) {
        text.setValue(this.generateName(this.folder));
      }
    });

    // Secret toggle
    new Setting(this.contentEl)
      .setName("Secret Vault")
      .setDesc("Content will be hidden from lookup results")
      .addToggle((toggle) => {
        toggle.setValue(this.isSecret).onChange((value) => {
          this.isSecret = value;
        });
      });

    // Submit button
    new Setting(this.contentEl).addButton((btn) => {
      btn
        .setCta()
        .setButtonText(this.folder ? "Save" : "Add")
        .onClick(() => {
          const name = this.nameText.getValue();
          if (!this.folder || name.trim().length === 0) {
            new Notice("Please specify Vault Path and Vault Name");
            return;
          }

          if (
            this.onSubmit({
              path: this.folder.path,
              name,
              isSecret: this.isSecret,
            })
          )
            this.close();
        });
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}
