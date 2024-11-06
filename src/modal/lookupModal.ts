import { App, SuggestModal, getIcon } from "obsidian";
import Fuse, { FuseResultMatch } from 'fuse.js';
import { Note } from "../engine/note";
import { openFile } from "../utils";
import { StructuredVault } from "../engine/structuredVault";
import { StructuredWorkspace } from "../engine/structuredWorkspace";
import { SelectVaultModal } from "./selectVaultModal";
import { isPathExcluded } from "src/pathExclusion";

interface LookupItem {
  note: Note;
  vault: StructuredVault;
  matches?: readonly FuseResultMatch[];
  excluded: boolean;
}


type LookupResult = LookupItem | { type: 'create_new' };

export class LookupModal extends SuggestModal<LookupResult> {
  private fuse: Fuse<LookupItem>;
  private allNotes: LookupItem[];
  private lastQuery = '';

  constructor(
    app: App,
    private workspace: StructuredWorkspace,
    private initialQuery: string = "",
    private excludedPaths: string[] = []
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

    this.allNotes = this.workspace.vaultList.flatMap(vault =>
      vault.tree.flatten().map(note => ({
        note,
        vault,
        excluded: isPathExcluded(note.getPath(), this.excludedPaths)
      }))
    );

    this.allNotes.sort((a, b) => {
      if (a.excluded !== b.excluded) {
        return a.excluded ? 1 : -1;
      }
      const aTitle = a.note.title || a.note.name;
      const bTitle = b.note.title || b.note.name;
      return aTitle.localeCompare(bTitle);
    });


    this.fuse = new Fuse(this.allNotes, {
      keys: [
        'note.title',
        'note.name',
        {
          name: 'note.file.name',
          weight: 0.8
        }
      ],
      includeScore: true,
      includeMatches: true,
      threshold: 0.4,
    });
  }

  onOpen(): void {
    super.onOpen();
    if (this.initialQuery.length > 0) {
      this.inputEl.value = this.initialQuery;
      this.inputEl.dispatchEvent(new Event("input"));
    }
  }

  getSuggestions(query: string): LookupResult[] {
    this.lastQuery = query;
    if (!query.trim()) {
      return this.allNotes.filter(item => !item.excluded);
    }
  
    let result: LookupItem[];
    
    // For long queries, first try an exact match
    if (query.length > 60) {
      const exactMatch = this.allNotes.find(item => 
        item.note.getPath().toLowerCase() === query.toLowerCase()
      );
      if (exactMatch) {
        result = [exactMatch];
      } else {
        // If no exact match, perform a more restrictive search
        result = this.allNotes.filter(item => 
          item.note.getPath().toLowerCase().includes(query.toLowerCase())
        );
      }
    } else {
      // For shorter queries, use the full fuzzy search
      const fuzzyResults = this.fuse.search(query);
      result = fuzzyResults.map(r => ({...r.item, matches: r.matches}));
    }
  
    // Sort results: non-excluded first, then by relevance
    result.sort((a, b) => {
      if (a.excluded !== b.excluded) {
        return a.excluded ? 1 : -1;
      }
      return a.note.getPath().toLowerCase().indexOf(query.toLowerCase()) - 
             b.note.getPath().toLowerCase().indexOf(query.toLowerCase());
    });
  
    const exactMatch = result.find(item => item.note.getPath().toLowerCase() === query.toLowerCase());
    
    // Convert result to LookupResult[]
    const lookupResults: LookupResult[] = result.slice(0, 20);
  
    // Add 'create new' option if there's no exact match and query is not empty
    if (!exactMatch && query.trim().length > 0) {
      lookupResults.unshift({ type: 'create_new' });
    }
  
    return lookupResults;
  }


  renderSuggestion(item: LookupResult, el: HTMLElement) {
    if (this.isLookupItem(item)) {
      this.renderLookupItem(item, el);
    } else {
      this.renderCreateNew(el);
    }
  }

  private renderLookupItem(item: LookupItem, el: HTMLElement) {
    this.refreshNoteMetadata(item);
    el.classList.add("mod-complex");
    const path = item.note.getPath();
    if (path) {
      el.dataset["path"] = path;
    }
  
    if (item.excluded) {
      el.addClass("excluded-path");
    }
  
    el.createEl("div", { cls: "suggestion-content" }, (el) => {
      const titleContainer = el.createEl("div", { cls: "suggestion-title" });
  
      const titleText = item.note.title || item.note.name;
      const highlightedTitle = this.highlightMatches(titleText, item.matches, ['note.title', 'note.name']);
      const highlightedPath = this.highlightMatches(path || '', item.matches, ['note.getPath', 'note.file.name']);
      
      titleContainer.innerHTML = highlightedTitle || titleText;
      
      const pathAndVaultSpan = titleContainer.createSpan({ cls: "suggestion-path" });
      if (path) {
        pathAndVaultSpan.innerHTML = ` - ${highlightedPath || path}`;
      }
      if (this.workspace.vaultList.length > 1) {
        pathAndVaultSpan.appendText(` (${item.vault.config.name})`);
      }

      if (item.excluded) {
        titleContainer.createSpan({ cls: "excluded-label" });
      }

      el.createEl("small", {
        text: item.note.desc || "",
        cls: "suggestion-content",
      });
    });
  }

  private renderCreateNew(el: HTMLElement) {
    el.classList.add("mod-complex");
    el.createEl("div", { cls: "suggestion-content" }, (el) => {
      const titleContainer = el.createEl("div", { cls: "suggestion-title" });
      titleContainer.createSpan({ text: "Create New" });
      el.createEl("small", {
        text: "Note does not exist",
        cls: "suggestion-content",
      });
    });
    el.createEl("div", { cls: "suggestion-aux" }, (el) => {
      const icon = getIcon("plus");
      if (icon) {
        el.append(icon);
      } else {
        el.textContent = "+";
      }
    });
  }

  

  async onChooseSuggestion(item: LookupResult, evt: MouseEvent | KeyboardEvent) {
    if (this.isLookupItem(item) && item.note.file) {
      openFile(this.app, item.note.file);
      return;
    }

    const path = this.isLookupItem(item) ? item.note.getPath() : this.inputEl.value;

    const doCreate = async (vault: StructuredVault) => {
      const file = await vault.createNote(path);
      return openFile(vault.app, file);
    };

    if (this.isLookupItem(item) && item.vault) {
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

  private highlightMatches(text: string, matches: readonly FuseResultMatch[] | undefined, keys: string[]): string | null {
    if (!matches) return null;
    
    const relevantMatches = matches.filter(m => m.key && keys.includes(m.key));
    if (relevantMatches.length === 0) return null;

    let highlightedText = '';
    let lastIndex = 0;
    const indices = relevantMatches.flatMap(m => m.indices).sort((a, b) => a[0] - b[0]);
    
    indices.forEach(([start, end]) => {
      if (start < lastIndex) return;
      highlightedText += text.slice(lastIndex, start);
      highlightedText += `<b>${text.slice(start, end + 1)}</b>`;
      lastIndex = end + 1;
    });
    highlightedText += text.slice(lastIndex);

    return highlightedText !== text ? highlightedText : null;
  }

  private isLookupItem(item: LookupResult): item is LookupItem {
    return (item as LookupItem).note !== undefined;
  }

}
