import {
  App,
  Modal,
  Notice,
  Setting,
  TFolder,
  TextComponent,
  DropdownComponent,
  ToggleComponent,
} from "obsidian";
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
      this.originalVaultName = existingVault.name; // Store original name
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
    const headerEl = contentEl.createDiv("modal-header");

    new Setting(headerEl)
      .setHeading()
      .setName(this.folder ? "Edit Vault" : "Add Vault")
      .addButton((btn) => {
        btn
          .setCta()
          .setButtonText(this.folder ? "Save" : "Add")
          .onClick(() => this.saveVault());
      });

    // Main content area
    const contentContainer = contentEl.createDiv("modal-content");
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
    containerEl.createEl("h3", { text: "Property Settings" });

    // Create a container for all property settings
    const propertySettingsWrapper = containerEl.createDiv("property-settings-wrapper");

    new Setting(propertySettingsWrapper)
      .setName("Override Property Settings")
      .setDesc("Enable to override global property settings for this vault")
      .addToggle((toggle) => {
        toggle.setValue(this.propertiesEnabled).onChange((value) => {
          this.propertiesEnabled = value;

          if (!value) {
            this.propertySettings = {};
          }

          propertySettingsWrapper.children[1]?.remove();
          if (value) {
            this.displayPropertySettings(propertySettingsWrapper);
          }
        });
      });

    if (this.propertiesEnabled) {
      this.displayPropertySettings(propertySettingsWrapper);
    }
  }

  private displayPropertySettings(containerEl: HTMLElement) {
    // Create a container for all property settings
    const propertySettingsWrapper = containerEl.createDiv("property-settings-wrapper");

    // Add warning disclaimer
    const disclaimer = propertySettingsWrapper.createEl("div", {
      cls: "structured-experimental-disclaimer",
    });

    disclaimer.createSpan({ text: "⚠️ ", cls: "structured-experimental-icon" });

    disclaimer.createSpan({
      text: "Please reload or restart Obsidian after changing these settings",
      cls: "structured-experimental-text",
    });

    if (!this.propertiesEnabled) return;

    let generateIdToggle: ToggleComponent;
    let generateTitleToggle: ToggleComponent;
    let generateDescToggle: ToggleComponent;
    let generateTagsToggle: ToggleComponent;
    let generateCreatedToggle: ToggleComponent;

    new Setting(propertySettingsWrapper)
      .setName("Auto-generate Properties")
      .setHeading()
      .setDesc("Generate properties for new files")
      .addToggle((toggle) => {
        toggle
          .setValue(this.propertySettings.autoGenerateFrontmatter ?? false)
          .onChange((value) => {
            this.propertySettings.autoGenerateFrontmatter = value;
            if (!value) {
              // Disable and reset all dependent toggles
              this.propertySettings.generateId = false;
              this.propertySettings.generateTitle = false;
              this.propertySettings.generateDesc = false;
              this.propertySettings.generateTags = false;
              this.propertySettings.generateCreated = false;
              generateIdToggle.setValue(false);
              generateTitleToggle.setValue(false);
              generateDescToggle.setValue(false);
              generateTagsToggle.setValue(false);
              generateCreatedToggle.setValue(false);
            }
            // Update disabled state of all toggles
            generateIdToggle.setDisabled(!value);
            generateTitleToggle.setDisabled(!value);
            generateDescToggle.setDisabled(!value);
            generateTagsToggle.setDisabled(!value);
            generateCreatedToggle.setDisabled(!value);
          });
      });

      propertySettingsWrapper.createDiv("setting-item-separator");

    const handleDisabledToggleClick = (toggle: ToggleComponent, settingName: string) => {
      if (toggle.disabled) {
        new Notice(`Enable "Auto-generate Properties" to use ${settingName}`);
      }
    };

    new Setting(propertySettingsWrapper)
      .setName("ID Property")
      .setDesc("Generate a unique ID for new files")
      .addToggle((toggle) => {
        generateIdToggle = toggle;
        toggle
          .setValue(this.propertySettings.generateId ?? false)
          .setDisabled(!this.propertySettings.autoGenerateFrontmatter)
          .onChange((value) => {
            this.propertySettings.generateId = value;
          });

        toggle.toggleEl.addEventListener("click", () =>
          handleDisabledToggleClick(toggle, "ID Property")
        );
      });

    new Setting(propertySettingsWrapper)
      .setName("Title Property")
      .setDesc("Generate title property for new files")
      .addToggle((toggle) => {
        generateTitleToggle = toggle;
        toggle
          .setValue(this.propertySettings.generateTitle ?? false)
          .setDisabled(!this.propertySettings.autoGenerateFrontmatter)
          .onChange((value) => {
            this.propertySettings.generateTitle = value;
          });

        toggle.toggleEl.addEventListener("click", () =>
          handleDisabledToggleClick(toggle, "Title Property")
        );
      });

    new Setting(propertySettingsWrapper)
      .setName("Description Property")
      .setDesc("Generate description property for new files")
      .addToggle((toggle) => {
        generateDescToggle = toggle;
        toggle
          .setValue(this.propertySettings.generateDesc ?? false)
          .setDisabled(!this.propertySettings.autoGenerateFrontmatter)
          .onChange((value) => {
            this.propertySettings.generateDesc = value;
          });

        toggle.toggleEl.addEventListener("click", () =>
          handleDisabledToggleClick(toggle, "Description Property")
        );
      });

    new Setting(propertySettingsWrapper)
      .setName("Created Date Property")
      .setDesc("Generate created date property for new files")
      .addToggle((toggle) => {
        generateCreatedToggle = toggle;
        toggle
          .setValue(this.propertySettings.generateCreated ?? false)
          .setDisabled(!this.propertySettings.autoGenerateFrontmatter)
          .onChange((value) => {
            this.propertySettings.generateCreated = value;
          });

        toggle.toggleEl.addEventListener("click", () =>
          handleDisabledToggleClick(toggle, "Created Date Property")
        );
      });

    new Setting(propertySettingsWrapper)
      .setName("Tags Property")
      .setDesc("Generate tags property for new files")
      .addToggle((toggle) => {
        generateTagsToggle = toggle;
        toggle
          .setValue(this.propertySettings.generateTags ?? false)
          .setDisabled(!this.propertySettings.autoGenerateFrontmatter)
          .onChange((value) => {
            this.propertySettings.generateTags = value;
          });

        toggle.toggleEl.addEventListener("click", () =>
          handleDisabledToggleClick(toggle, "Tags Property")
        );
      });

    new Setting(propertySettingsWrapper)
      .setName("Created Date Format")
      .setDesc("Choose the format for the created date")
      .addDropdown((dropdown: DropdownComponent) => {
        dropdown
          .addOption("yyyy-mm-dd", "YYYY-MM-DD")
          .addOption("unix", "Unix (Milliseconds)")
          .setValue(this.propertySettings.createdFormat ?? "yyyy-mm-dd")
          .onChange((value) => {
            this.propertySettings.createdFormat = value as "yyyy-mm-dd" | "unix";
          });
      });

    // Property Keys Section
    propertySettingsWrapper.createEl("h4", { text: "Property Keys" });

    new Setting(propertySettingsWrapper)
      .setName("ID Key")
      .setDesc("Property to use for the note ID")
      .addText((text) => {
        text
          .setPlaceholder("id")
          .setValue(this.propertySettings.idKey ?? "")
          .onChange((value) => {
            this.propertySettings.idKey = value.trim();
          });
      });

    new Setting(propertySettingsWrapper)
      .setName("Title Key")
      .setDesc("Property to use for the note title")
      .addText((text) => {
        text
          .setPlaceholder("title")
          .setValue(this.propertySettings.titleKey ?? "")
          .onChange((value) => {
            this.propertySettings.titleKey = value.trim();
          });
      });

    new Setting(propertySettingsWrapper)
      .setName("Description Key")
      .setDesc("Property to use for note description")
      .addText((text) => {
        text
          .setPlaceholder("desc")
          .setValue(this.propertySettings.descKey ?? "")
          .onChange((value) => {
            this.propertySettings.descKey = value.trim();
          });
      });

    new Setting(propertySettingsWrapper)
      .setName("Created Key")
      .setDesc("Property to use for note creation date")
      .addText((text) => {
        text
          .setPlaceholder("created")
          .setValue(this.propertySettings.createdKey ?? "")
          .onChange((value) => {
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
