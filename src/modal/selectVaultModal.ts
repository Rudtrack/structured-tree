import { App, SuggestModal } from "obsidian";
import { StructuredVault } from "../engine/structuredVault";
import { StructuredWorkspace } from "../engine/structuredWorkspace";

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
    const activeFile = this.app.workspace.getActiveFile();

    return this.workspace.vaultList.filter((vault) => {
      const matchesQuery =
        vault.config.path.toLowerCase().contains(queryLowercase) ||
        vault.config.name.toLowerCase().contains(queryLowercase);
      const isAccessible = vault.isAccessibleFrom(activeFile);
      return matchesQuery && isAccessible;
    });
  }
  renderSuggestion(value: StructuredVault, el: HTMLElement) {
    el.createEl("div", { text: value.config.name });
    el.createEl("small", {
      text: value.config.path,
    });
  }
  onChooseSuggestion(item: StructuredVault, evt: MouseEvent | KeyboardEvent) {
    this.onSelected(item);
  }
}
