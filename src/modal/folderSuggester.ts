import { App, PopoverSuggest, TFolder } from "obsidian";

export class FolderSuggester extends PopoverSuggest<TFolder> {
  constructor(
    public app: App,
    public inputEl: HTMLInputElement,
    public onSelected: (folder: TFolder) => void
  ) {
    super(app);

    inputEl.addEventListener("input", this.onInputChange);
    inputEl.addEventListener("focus", this.onInputChange);
    inputEl.addEventListener("blur", () => this.close());
    this.suggestEl.on("mousedown", ".suggestion-item", (e) => e.preventDefault());
    this.suggestEl.classList.add("structured-folder-suggest");
  }
  onInputChange = () => {
    const suggestionList = this.getSuggestions(this.inputEl.value);
    if (suggestionList.length === 0) {
      this.close();
      return;
    }
    this.suggestions.setSuggestions(suggestionList);
    this.open();
    this.setAutoDestroy(this.inputEl);

    this.suggestEl.classList.add("suggestion-width-dynamic");
    this.suggestEl.style.setProperty("--suggestion-width", `${this.inputEl.offsetWidth}px`);

    const loc = this.inputEl.getBoundingClientRect();
    this.reposition({
      left: loc.left,
      right: loc.right,
      top: loc.top,
      bottom: loc.top + this.inputEl.offsetHeight,
    });
  };
  getSuggestions(query: string): TFolder[] {
    const queryLowercase = query.toLowerCase();
    return this.app.vault
      .getAllLoadedFiles()
      .filter(
        (file): file is TFolder =>
          file instanceof TFolder && file.path.toLowerCase().includes(queryLowercase)
      );
  }
  renderSuggestion(value: TFolder, el: HTMLElement): void {
    el.createDiv({
      text: value.path,
    });
  }
  selectSuggestion(value: TFolder, evt: MouseEvent | KeyboardEvent): void {
    this.inputEl.value = value.path;
    this.close();
    this.onSelected(value);
  }
}
