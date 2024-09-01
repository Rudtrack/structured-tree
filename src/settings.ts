import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import StructuredTreePlugin from "./main";
import { VaultConfig } from "./engine/vault";
import { AddVaultModal } from "./modal/add-vault";

export interface StructuredTreePluginSettings {
  vaultPath?: string;
  vaultList: VaultConfig[];
  autoGenerateFrontmatter: boolean;
  autoReveal: boolean;
  customResolver: boolean;
  customGraph: boolean;
  titleKey: string;
  descKey: string;
}

export const DEFAULT_SETTINGS: StructuredTreePluginSettings = {
  vaultList: [
    {
      name: "root",
      path: "/",
    },
  ],
  autoGenerateFrontmatter: true,
  autoReveal: true,
  customResolver: false,
  customGraph: false,
  titleKey: "title",
  descKey: "desc"
};

export class StructuredTreeSettingTab extends PluginSettingTab {
  plugin: StructuredTreePlugin;

  constructor(app: App, plugin: StructuredTreePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName("Auto Generate Frontmatter")
      .setDesc("Generate frontmatter for new file even if file is created outside of Structured tree")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.autoGenerateFrontmatter).onChange(async (value) => {
          this.plugin.settings.autoGenerateFrontmatter = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Auto Reveal")
      .setDesc("Automatically reveal active file in Structured Tree")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.autoReveal).onChange(async (value) => {
          this.plugin.settings.autoReveal = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Custom Resolver")
      .setDesc(
        "Use custom resolver to resolve ref/embed and link. (Please reopen editor after change this setting)"
      )
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.customResolver).onChange(async (value) => {
          this.plugin.settings.customResolver = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Custom Graph Engine")
      .setDesc("Use custom graph engine to render graph (Experimental)")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.customGraph).onChange(async (value) => {
          this.plugin.settings.customGraph = value;
          await this.plugin.saveSettings();
        });
      });

    containerEl.createEl('h4', { text: ("Lookup") });

    new Setting(containerEl)
    .setName("Title Key")
    .setDesc("Property to use for note title")
    .addText((text) =>
      text
        .setPlaceholder("title")
        .setValue(this.plugin.settings.titleKey)
        .onChange(async (value) => {
          this.plugin.settings.titleKey = value;
          await this.plugin.saveSettings();
        })
    );
  
    new Setting(containerEl)
    .setName("Description Key")
    .setDesc("Property to use for note description")
    .addText((text) =>
      text
        .setPlaceholder("desc")
        .setValue(this.plugin.settings.descKey)
        .onChange(async (value) => {
          this.plugin.settings.descKey = value;
          await this.plugin.saveSettings();
        })
    );

    containerEl.createEl('h4', { text: ("Vaults") });
    
    for (const vault of this.plugin.settings.vaultList) {
      new Setting(containerEl)
        .setName(vault.name)
        .setDesc(`Folder: ${vault.path}`)
        .addButton((btn) => {
          btn.setButtonText("Remove").onClick(async () => {
            this.plugin.settings.vaultList.remove(vault);
            await this.plugin.saveSettings();
            this.display();
          });
        });
    }
    new Setting(containerEl).addButton((btn) => {
      btn.setButtonText("Add Vault").onClick(() => {
        new AddVaultModal(this.app, (config) => {
          const list = this.plugin.settings.vaultList;
          const nameLowecase = config.name.toLowerCase();
          if (list.find(({ name }) => name.toLowerCase() === nameLowecase)) {
            new Notice("Vault with same name already exist");
            return false;
          }
          if (list.find(({ path }) => path === config.path)) {
            new Notice("Vault with same path already exist");
            return false;
          }

          list.push(config);
          this.plugin.saveSettings().then(() => this.display());
          return true;
        }).open();
      });
    });
  }
  hide() {
    super.hide();
    this.plugin.onRootFolderChanged();
    this.plugin.configureCustomResolver();
    this.plugin.configureCustomGraph();
  }
}
