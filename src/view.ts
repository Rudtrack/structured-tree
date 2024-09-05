import { ItemView, WorkspaceLeaf } from 'obsidian';

import Component from './components/MainComponent.svelte';
import StructuredTreePlugin from './main';
import * as store from './store';
import { structuredActivityBarName } from './icons';

export const VIEW_TYPE_STRUCTURED = 'structured-tree-view';

export class StructuredView extends ItemView {
	component: Component;
	icon = structuredActivityBarName;

	constructor(
		leaf: WorkspaceLeaf,
		private plugin: StructuredTreePlugin
	) {
		super(leaf);
	}

	getViewType() {
		return VIEW_TYPE_STRUCTURED;
	}

	getDisplayText() {
		return 'Structured Tree';
	}

	async onOpen() {
		store.plugin.set(this.plugin);
		this.component = new Component({
			target: this.contentEl,
		});
	}

	async onClose() {
		this.component.$destroy();
	}
}
