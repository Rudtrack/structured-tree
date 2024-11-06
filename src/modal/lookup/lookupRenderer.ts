import { getIcon } from "obsidian";
import { LookupItem, LookupResult } from "./lookupTypes";
import { FuseResultMatch } from 'fuse.js';
import { StructuredWorkspace } from "../../engine/structuredWorkspace";
import { LookupUtils } from "./lookupUtils";

export class LookupRenderer {
  constructor(private workspace: StructuredWorkspace) {}

  renderSuggestion(item: LookupResult, el: HTMLElement) {
    if (LookupUtils.isLookupItem(item)) {
      this.renderLookupItem(item, el);
    } else {
      this.renderCreateNew(el);
    }
  }

  private renderLookupItem(item: LookupItem, el: HTMLElement) {
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
      const highlightedTitle = LookupUtils.highlightMatches(titleText, item.matches, ['note.title', 'note.name']);
      const highlightedPath = LookupUtils.highlightMatches(path || '', item.matches, ['note.getPath', 'note.file.name']);
      
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
