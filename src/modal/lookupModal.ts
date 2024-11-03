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

export class LookupModal extends SuggestModal<LookupItem | null> {
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
      keys: ['note.title', 'note.name', 'note.getPath'],
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

  getSuggestions(query: string): (LookupItem | null)[] {
    this.lastQuery = query;
    if (!query.trim()) {
      return this.allNotes.filter(item => !item.excluded);
    }
  
    const fuzzyResults = this.fuse.search(query);
    const result: LookupItem[] = fuzzyResults.map(r => ({...r.item, matches: r.matches}));
  
    // Sort results: non-excluded first, then by score
    result.sort((a, b) => {
      if (a.excluded !== b.excluded) {
        return a.excluded ? 1 : -1;
      }
      // If both are excluded or both are not excluded, sort by score
      const scoreA = fuzzyResults.find(r => r.item === a)?.score ?? 1;
      const scoreB = fuzzyResults.find(r => r.item === b)?.score ?? 1;
      return scoreA - scoreB;
    });
  
    const exactMatch = result.find(item => item.note.getPath().toLowerCase() === query.toLowerCase());
    if (!exactMatch && query.trim().length > 0) {
      result.unshift(null as any); 
    }
  
    return result;
  }

  renderSuggestion(item: LookupItem | null, el: HTMLElement) {
    this.refreshNoteMetadata(item);
    el.classList.add("mod-complex");
    const path = item?.note.getPath();
    if (path) {
      el.dataset["path"] = path;
    }
  
    if (item && item.excluded) {
      el.addClass("excluded-path");
    }
  
    el.createEl("div", { cls: "suggestion-content" }, (el) => {
      const titleContainer = el.createEl("div", { cls: "suggestion-title" });
  
      if (item) {
        const titleText = item.note.title || item.note.name;
        const highlightedTitle = this.highlightMatches(titleText, item.matches, ['note.title']);
        const highlightedPath = this.highlightMatches(path || '', item.matches, ['note.getPath']);
        
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
      } else {
        titleContainer.createSpan({ text: "Create New" });
      }
  
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
}
