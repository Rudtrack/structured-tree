import { Modal, Setting } from 'obsidian';
import { StructuredVault } from '../engine/structuredVault';

export class InvalidRootModal extends Modal {
	constructor(private structuredVault: StructuredVault) {
		super(structuredVault.app);
	}

	onOpen(): void {
		this.contentEl.createEl('h1', { text: 'Invalid Root' });
		this.contentEl.createEl('p', {
			text: `"${this.structuredVault.config.path}" is not folder. Do you want to create this folder?`,
		});
		new Setting(this.contentEl).addButton((button) => {
			button
				.setButtonText('Create')
				.setCta()
				.onClick(async () => {
					await this.structuredVault.createRootFolder();
					this.structuredVault.init();
					this.close();
				});
		});
	}

	onClose() {
		this.contentEl.empty();
	}
}
