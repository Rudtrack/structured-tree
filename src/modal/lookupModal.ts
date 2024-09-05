import { App, SuggestModal, getIcon } from "obsidian";
import { Note } from "../engine/note";
import { openFile } from "../utils";
import { StructuredVault } from "../engine/structuredVault";
import { StructuredWorkspace } from "../engine/structuredWorkspace";
import { SelectVaultModal } from "./selectVaultModal";

interface LookupItem {
	note: Note;
	vault: StructuredVault;
}

export class LookupModal extends SuggestModal<LookupItem | null> {
	constructor(
		app: App,
		private workspace: StructuredWorkspace,
		private initialQuery: string = ""
	) {
		super(app);

		this.inputEl.setAttribute("spellcheck", "false");

		this.inputEl.addEventListener("keyup", (event) => {
			if (event.code === "Tab") {
				const selectedElement = this.resultContainerEl.querySelector(
					".is-selected"
				) as HTMLElement | null;
				if (selectedElement) {
					const path = selectedElement.dataset["path"];
					if (path) {
						this.inputEl.value = path;
						this.inputEl.dispatchEvent(new Event("input"));
					}
				}
			}
		});
	}

	onOpen(): void {
		super.onOpen();
		if (this.initialQuery.length > 0) {
			this.inputEl.value = this.initialQuery;
			this.inputEl.dispatchEvent(new Event("input"));
		}
	}

	getSuggestions(query: string): (LookupItem | null)[] {
		const queryLowercase = query.toLowerCase();
		const result: (LookupItem | null)[] = [];

		let foundExact = true;

		for (const vault of this.workspace.vaultList) {
			let currentFoundExact = false;
			for (const note of vault.tree.flatten()) {
				const path = note.getPath();
				const item: LookupItem = {
					note,
					vault,
				};
				if (path === queryLowercase) {
					currentFoundExact = true;
					result.unshift(item);
					continue;
				}
				if (
					note.title.toLowerCase().includes(queryLowercase) ||
					note.name.includes(queryLowercase) ||
					path.includes(queryLowercase)
				)
					result.push(item);
			}

			foundExact = foundExact && currentFoundExact;
		}

		if (!foundExact && queryLowercase.trim().length > 0) result.unshift(null);

		return result;
	}

	renderSuggestion(item: LookupItem | null, el: HTMLElement) {
		this.refreshNoteMetadata(item);
		el.classList.add("mod-complex");
		const path = item?.note.getPath();
		if (path) {
			el.dataset["path"] = path;
		}
		el.createEl("div", { cls: "suggestion-content" }, (el) => {
			// Create a container for title, path, and vault name
			const titleContainer = el.createEl("div", { cls: "suggestion-title" });

			// Add title
			titleContainer.createSpan({ text: item?.note.title ?? "Create New" });

			// Add path and vault name after title (if they exist)
			if (item) {
				const pathAndVaultSpan = titleContainer.createSpan({ cls: "suggestion-path" });
				if (path) {
					pathAndVaultSpan.appendText(` - ${path}`);
				}
				if (this.workspace.vaultList.length > 1) {
					pathAndVaultSpan.appendText(` (${item.vault.config.name})`);
				}
			}

			// Add description or "Note does not exist" message
			el.createEl("small", {
				text: item ? item.note.desc || "" : "Note does not exist",
				cls: "suggestion-content",
			});
		});
		if (!item || !item.note.file) {
			el.createEl("div", { cls: "suggestion-aux" }, (el) => {
				const icon = getIcon("plus");
				if (icon) {
					el.append(icon);
				} else {
					el.textContent = "+";
				}
			});
		}
	}

	async onChooseSuggestion(item: LookupItem | null, evt: MouseEvent | KeyboardEvent) {
		if (item && item.note.file) {
			openFile(this.app, item.note.file);
			return;
		}

		const path = item ? item.note.getPath() : this.inputEl.value;

		const doCreate = async (vault: StructuredVault) => {
			const file = await vault.createNote(path);
			return openFile(vault.app, file);
		};
		if (item?.vault) {
			await doCreate(item.vault);
		} else if (this.workspace.vaultList.length == 1) {
			await doCreate(this.workspace.vaultList[0]);
		} else {
			new SelectVaultModal(this.app, this.workspace, doCreate).open();
		}
	}
	private refreshNoteMetadata(item: LookupItem | null) {
		if (item && item.note.file) {
			const metadata = item.vault.resolveMetadata(item.note.file);
			if (metadata) {
				item.note.syncMetadata(metadata);
			}
		}
	}
}
