import { App, SuggestModal } from 'obsidian';
import { StructuredVault } from '../engine/structuredVault';
import { StructuredWorkspace } from '../engine/structuredWorkspace';

export class SelectVaultModal extends SuggestModal<StructuredVault> {
	constructor(
		app: App,
		private workspace: StructuredWorkspace,
		private onSelected: (item: StructuredVault) => void
	) {
		super(app);
	}

	getSuggestions(query: string): StructuredVault[] | Promise<StructuredVault[]> {
		const queryLowercase = query.toLowerCase();
		return this.workspace.vaultList.filter(
			(value) =>
				value.config.path.toLowerCase().contains(queryLowercase) ||
				value.config.name.toLowerCase().contains(queryLowercase)
		);
	}
	renderSuggestion(value: StructuredVault, el: HTMLElement) {
		el.createEl('div', { text: value.config.name });
		el.createEl('small', {
			text: value.config.path,
		});
	}
	onChooseSuggestion(item: StructuredVault, evt: MouseEvent | KeyboardEvent) {
		this.onSelected(item);
	}
}
