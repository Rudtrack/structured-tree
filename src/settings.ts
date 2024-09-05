import { App, Notice, PluginSettingTab, Setting, ToggleComponent } from "obsidian";
import StructuredTreePlugin from "./main";
import { VaultConfig } from "./engine/structuredVault";
import { AddVaultModal } from "./modal/folderSuggester";

export interface StructuredTreePluginSettings {
	vaultPath?: string;
	vaultList: VaultConfig[];
	autoReveal: boolean;
	customResolver: boolean;
	customGraph: boolean;
	enableCanvasSupport: boolean;
	autoGenerateFrontmatter: boolean;
	titleKey: string;
	descKey: string;
	generateTags: boolean;
	generateId: boolean;
	generateCreated: boolean;
}

export const DEFAULT_SETTINGS: StructuredTreePluginSettings = {
	vaultList: [
		{
			name: "root",
			path: "/",
		},
	],
	autoReveal: true,
	customResolver: false,
	customGraph: false,
	enableCanvasSupport: false,
	autoGenerateFrontmatter: true,
	titleKey: "title",
	descKey: "desc",
	generateTags: true,
	generateId: true,
	generateCreated: true,
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
				"Use custom resolver to resolve ref/embed and link. (Please reopen or reload editor after changing)"
			)
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.customResolver).onChange(async (value) => {
					this.plugin.settings.customResolver = value;
					await this.plugin.saveSettings();
				});
			});

		containerEl.createEl("h3", { text: "Properties" });

		let generateIdToggle: ToggleComponent;
		let generateTagsToggle: ToggleComponent;
		let generateCreatedToggle: ToggleComponent;

		new Setting(containerEl)
			.setName("Auto-generate Properties")
			.setHeading()
			.setDesc("Generate properties for new files")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.autoGenerateFrontmatter).onChange(async (value) => {
					this.plugin.settings.autoGenerateFrontmatter = value;
					if (!value) {
						this.plugin.settings.generateId = false;
						this.plugin.settings.generateTags = false;
						generateIdToggle.setValue(false);
						generateTagsToggle.setValue(false);
						generateCreatedToggle.setValue(false);
					}
					generateIdToggle.setDisabled(!value);
					generateTagsToggle.setDisabled(!value);
					generateCreatedToggle.setDisabled(!value);
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName("ID Property")
			.setDesc("Generate a 23 character long, unique alphanumeric ID for new files")
			.addToggle((toggle) => {
				generateIdToggle = toggle;
				toggle
					.setValue(this.plugin.settings.generateId)
					.setDisabled(!this.plugin.settings.autoGenerateFrontmatter)
					.onChange(async (value) => {
						this.plugin.settings.generateId = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Created Date Property")
			.setDesc("Generate a property that stores the created date of the new file")
			.addToggle((toggle) => {
				generateCreatedToggle = toggle;
				toggle
					.setValue(this.plugin.settings.generateCreated)
					.setDisabled(!this.plugin.settings.autoGenerateFrontmatter)
					.onChange(async (value) => {
						this.plugin.settings.generateCreated = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Tag Property")
			.setDesc("Generate tag property for native Obsidian tags")
			.addToggle((toggle) => {
				generateTagsToggle = toggle;
				toggle
					.setValue(this.plugin.settings.generateTags)
					.setDisabled(!this.plugin.settings.autoGenerateFrontmatter)
					.onChange(async (value) => {
						this.plugin.settings.generateTags = value;
						await this.plugin.saveSettings();
					});
			});

		containerEl.createEl("h4", { text: "Special Properties" });

		new Setting(containerEl)
			.setName("Title Key")
			.setDesc("Property to use for the note title in the Tree and Lookup")
			.addText((text) =>
				text
					.setPlaceholder("title")
					.setValue(this.plugin.settings.titleKey)
					.onChange(async (value) => {
						this.plugin.settings.titleKey = value.trim() || DEFAULT_SETTINGS.titleKey;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Description Key")
			.setDesc("Property to use for note description in Lookup")
			.addText((text) =>
				text
					.setPlaceholder("desc")
					.setValue(this.plugin.settings.descKey)
					.onChange(async (value) => {
						this.plugin.settings.descKey = value.trim() || DEFAULT_SETTINGS.descKey;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl).addButton((btn) =>
			btn.setButtonText("Reset Property Keys").onClick(async () => {
				this.plugin.settings.titleKey = DEFAULT_SETTINGS.titleKey;
				this.plugin.settings.descKey = DEFAULT_SETTINGS.descKey;
				await this.plugin.saveSettings();
				this.display();
			})
		);

		containerEl.createEl("h3", { text: "Vaults" });

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

		containerEl.createEl("h3", { text: "Experimental Features" });
		containerEl.createEl("p", {
			text: "These features are not completed yet. Expect bugs if you use them.",
		});

		new Setting(containerEl)
			.setName("Enable Canvas Support")
			.setDesc("Enable support for displaying .canvas files in the tree")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.enableCanvasSupport).onChange(async (value) => {
					this.plugin.settings.enableCanvasSupport = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName("Custom Graph Engine")
			.setDesc("Use custom graph engine to render graph")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.customGraph).onChange(async (value) => {
					this.plugin.settings.customGraph = value;
					await this.plugin.saveSettings();
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
