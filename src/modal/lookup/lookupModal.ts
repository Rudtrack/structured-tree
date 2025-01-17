import { App, SuggestModal, debounce } from "obsidian";
import { StructuredWorkspace } from "../../engine/structuredWorkspace";
import { LookupResult } from "./lookupTypes";
import { LookupSuggestionManager } from "./lookupSuggestionManager";
import { LookupRenderer } from "./lookupRenderer";
import { LookupActionHandler } from "./lookupActionHandler";
import { LookupUtils } from "./lookupUtils";

export class LookupModal extends SuggestModal<LookupResult> {
  private suggestionManager: LookupSuggestionManager;
  private renderer: LookupRenderer;
  private actionHandler: LookupActionHandler;
  private lastQuery = "";
  private debouncedGetSuggestions: (
    query: string,
    callback: (results: LookupResult[]) => void
  ) => void;

  constructor(
    app: App,
    private workspace: StructuredWorkspace,
    private initialQuery: string = "",
    private excludedPaths: string[] = []
  ) {
    super(app);

    this.suggestionManager = new LookupSuggestionManager(workspace, excludedPaths);
    this.renderer = new LookupRenderer(workspace);
    this.actionHandler = new LookupActionHandler(app, workspace);

    this.inputEl.setAttribute("spellcheck", "false");

    this.debouncedGetSuggestions = debounce(
      (query: string, callback: (results: LookupResult[]) => void) => {
        this.lastQuery = query;
        const suggestions = this.suggestionManager.getSuggestions(query);
        callback(suggestions);
      },
      150
    );

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

  getSuggestions(query: string): Promise<LookupResult[]> {
    return new Promise((resolve) => {
      this.debouncedGetSuggestions(query, resolve);
    });
  }

  renderSuggestion(item: LookupResult, el: HTMLElement) {
    if (LookupUtils.isLookupItem(item)) {
      LookupUtils.refreshNoteMetadata(item);
    }
    this.renderer.renderSuggestion(item, el);
  }

  async onChooseSuggestion(item: LookupResult, evt: MouseEvent | KeyboardEvent) {
    await this.actionHandler.onChooseSuggestion(item, this.inputEl.value);
  }
}
