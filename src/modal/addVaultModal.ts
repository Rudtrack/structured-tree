import { App, Modal, Notice, Setting, TFolder, TextComponent, DropdownComponent } from "obsidian";
import { VaultConfig, VaultPropertySettings } from "../engine/structuredVault";
import { FolderSuggester } from "./folderSuggester";

export class AddVaultModal extends Modal {
  private originalVaultName?: string;
  private propertySettings: VaultPropertySettings = {};
  private folder?: TFolder;
  private nameText: TextComponent;
  private isSecret: boolean = false;
  private propertiesEnabled: boolean = false;

  constructor(
    app: App,
    public onSubmit: (config: VaultConfig) => boolean,
    existingVault?: VaultConfig
  ) {
    super(app);
    if (existingVault) {
      this.isSecret = existingVault.isSecret || false;
      this.folder = app.vault.getAbstractFileByPath(existingVault.path) as TFolder;
      this.originalVaultName = existingVault.name;  // Store original name
      if (existingVault.properties) {
        this.propertySettings = existingVault.properties;
        this.propertiesEnabled = true;
      }
    }
  }

  private generateName({ path, name }: TFolder) {
    if (path === "/") return "root";
    return name;
  }

  onOpen(): void {
    const { contentEl } = this;
    
    // Create header with title and save button
    const headerEl = contentEl.createDiv('modal-header');
    
    new Setting(headerEl)
        .setHeading()
        .setName(this.folder ? "Edit Vault" : "Add Vault")
        .addButton((btn) => {
            btn.setCta()
               .setButtonText(this.folder ? "Save" : "Add")
               .onClick(() => this.saveVault());
        });

    // Main content area
    const contentContainer = contentEl.createDiv('modal-content');
    this.addBasicSettings(contentContainer);
    this.addPropertySettings(contentContainer);
}

  private saveVault(): void {
    const name = this.nameText.getValue();
    if (!this.folder || name.trim().length === 0) {
        new Notice("Please specify Vault Path and Vault Name");
        return;
    }

    const config: VaultConfig = {
        path: this.folder.path,
        name,
        isSecret: this.isSecret,
    };

    if (this.propertiesEnabled && Object.keys(this.propertySettings).length > 0) {
        config.properties = this.propertySettings;
    }

    if (this.onSubmit(config)) {
        this.close();
    }
}

  private addBasicSettings(containerEl: HTMLElement) {
    new Setting(containerEl).setName("Vault Name").addText((text) => {
      this.nameText = text;
      if (this.folder) {
        text.setValue(this.originalVaultName ?? this.generateName(this.folder));
      }
    });

    new Setting(containerEl).setName("Vault Path").addText((text) => {
      if (this.folder) {
        text.setValue(this.folder.path);
      }

      new FolderSuggester(this.app, text.inputEl, (newFolder) => {
        const currentName = this.nameText.getValue();
        if (
          !this.originalVaultName && 
          (currentName.length === 0 ||
          (this.folder && currentName === this.generateName(this.folder)))
        ) {
          this.nameText.setValue(this.generateName(newFolder));
        }

        this.folder = newFolder;
      });
    });

    new Setting(containerEl)
      .setName("Secret Vault")
      .setDesc("Content will be hidden from lookup results")
      .addToggle((toggle) => {
        toggle.setValue(this.isSecret).onChange((value) => {
          this.isSecret = value;
        });
      });
  }

  private addPropertySettings(containerEl: HTMLElement) {
    containerEl.createEl('h3', { text: 'Property Settings' });
    
    new Setting(containerEl)
      .setName("Override Property Settings")
      .setDesc("Enable to override global property settings for this vault")
      .addToggle(toggle => {
        toggle.setValue(this.propertiesEnabled)
        .onChange(value => {
          this.propertiesEnabled = value;
          // Clear settings if disabled
          if (!value) {
            this.propertySettings = {};
          }
          this.displayPropertySettings(containerEl);
        });
      });

    this.displayPropertySettings(containerEl);
  }

  private displayPropertySettings(containerEl: HTMLElement) {
    const settingsContainer = containerEl.createDiv('property-settings-container');
    settingsContainer.empty();
    
    if (!this.propertiesEnabled) return;

    new Setting(settingsContainer)
      .setName("Auto-generate Properties")
      .setDesc("Generate properties for new files")
      .addToggle(toggle => {
        toggle
          .setValue(this.propertySettings.autoGenerateFrontmatter ?? false)
          .onChange(value => {
            this.propertySettings.autoGenerateFrontmatter = value;
          });
      });

    new Setting(settingsContainer)
      .setName("Generate ID")
      .setDesc("Generate a unique ID for new files")
      .addToggle(toggle => {
        toggle
          .setValue(this.propertySettings.generateId ?? false)
          .onChange(value => {
            this.propertySettings.generateId = value;
          });
      });

    new Setting(settingsContainer)
      .setName("Generate Title")
      .setDesc("Generate title property for new files")
      .addToggle(toggle => {
        toggle
          .setValue(this.propertySettings.generateTitle ?? false)
          .onChange(value => {
            this.propertySettings.generateTitle = value;
          });
      });

    new Setting(settingsContainer)
      .setName("Generate Description")
      .setDesc("Generate description property for new files")
      .addToggle(toggle => {
        toggle
          .setValue(this.propertySettings.generateDesc ?? false)
          .onChange(value => {
            this.propertySettings.generateDesc = value;
          });
      });

    new Setting(settingsContainer)
      .setName("Generate Created Date")
      .setDesc("Generate created date property for new files")
      .addToggle(toggle => {
        toggle
          .setValue(this.propertySettings.generateCreated ?? false)
          .onChange(value => {
            this.propertySettings.generateCreated = value;
          });
      });

    new Setting(settingsContainer)
      .setName("Generate Tags")
      .setDesc("Generate tags property for new files")
      .addToggle(toggle => {
        toggle
          .setValue(this.propertySettings.generateTags ?? false)
          .onChange(value => {
            this.propertySettings.generateTags = value;
          });
      });

    new Setting(settingsContainer)
      .setName("Created Date Format")
      .setDesc("Choose the format for the created date")
      .addDropdown((dropdown: DropdownComponent) => {
        dropdown
          .addOption("yyyy-mm-dd", "YYYY-MM-DD")
          .addOption("unix", "Unix (Milliseconds)")
          .setValue(this.propertySettings.createdFormat ?? "yyyy-mm-dd")
          .onChange(value => {
            this.propertySettings.createdFormat = value as "yyyy-mm-dd" | "unix";
          });
      });

    // Property Keys Section
    settingsContainer.createEl('h4', { text: 'Property Keys' });

    new Setting(settingsContainer)
      .setName("ID Key")
      .setDesc("Property to use for the note ID")
      .addText(text => {
        text
          .setPlaceholder("id")
          .setValue(this.propertySettings.idKey ?? "")
          .onChange(value => {
            this.propertySettings.idKey = value.trim();
          });
      });

    new Setting(settingsContainer)
      .setName("Title Key")
      .setDesc("Property to use for the note title")
      .addText(text => {
        text
          .setPlaceholder("title")
          .setValue(this.propertySettings.titleKey ?? "")
          .onChange(value => {
            this.propertySettings.titleKey = value.trim();
          });
      });

    new Setting(settingsContainer)
      .setName("Description Key")
      .setDesc("Property to use for note description")
      .addText(text => {
        text
          .setPlaceholder("desc")
          .setValue(this.propertySettings.descKey ?? "")
          .onChange(value => {
            this.propertySettings.descKey = value.trim();
          });
      });

    new Setting(settingsContainer)
      .setName("Created Key")
      .setDesc("Property to use for note creation date")
      .addText(text => {
        text
          .setPlaceholder("created")
          .setValue(this.propertySettings.createdKey ?? "")
          .onChange(value => {
            this.propertySettings.createdKey = value.trim();
          });
      });
  }

  private addSubmitButton(containerEl: HTMLElement) {
    new Setting(containerEl).addButton((btn) => {
      btn
        .setCta()
        .setButtonText(this.folder ? "Save" : "Add")
        .onClick(() => {
          const name = this.nameText.getValue();
          if (!this.folder || name.trim().length === 0) {
            new Notice("Please specify Vault Path and Vault Name");
            return;
          }

          const config: VaultConfig = {
            path: this.folder.path,
            name,
            isSecret: this.isSecret,
          };

          if (this.propertiesEnabled && Object.keys(this.propertySettings).length > 0) {
            config.properties = this.propertySettings;
          }

          if (this.onSubmit(config)) {
            this.close();
          }
        });
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}