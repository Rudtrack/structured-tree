import Fuse from "fuse.js";
import { LookupItem, LookupResult } from "./lookupTypes";
import { StructuredWorkspace } from "../../engine/structuredWorkspace";
import { isPathExcluded } from "src/pathExclusion";
import { TFile } from "obsidian";

export class LookupSuggestionManager {
  private fuse: Fuse<LookupItem>;
  private allNotes: LookupItem[];
  private activeFile: TFile | null = null;

  constructor(
    private workspace: StructuredWorkspace,
    private excludedPaths: string[] = []
  ) {
    this.initializeNotes();
    this.initializeFuse();
  }

  setActiveFile(file: TFile | null) {
    this.activeFile = file;
  }

  private initializeNotes() {
    this.allNotes = this.workspace.vaultList
      .filter(vault => !vault.config.isSecret)
      .flatMap((vault) =>
        vault.tree.flatten().map((note) => ({
          note,
          vault,
          excluded: isPathExcluded(note.getPath(), this.excludedPaths),
          exists: !!note.file,
        }))
    );

    // Keep existing sorting
    this.allNotes.sort((a, b) => {
      if (a.excluded !== b.excluded) {
        return a.excluded ? 1 : -1;
      }
      const aTitle = a.note.title || a.note.name;
      const bTitle = b.note.title || b.note.name;
      return aTitle.localeCompare(bTitle);
    });
  }

  private initializeFuse() {
    const settings = this.workspace.settings;
    this.fuse = new Fuse(this.allNotes, {
      keys: [
        "note.title",
        "note.name",
        {
          name: "note.file.name",
          weight: settings.fuzzySearchFileNameWeight,
        },
      ],
      includeScore: true,
      includeMatches: true,
      threshold: settings.fuzzySearchThreshold,
    });
  }

  getSuggestions(query: string): LookupResult[] {
    let results: LookupItem[];

    if (!query.trim()) {
      results = this.allNotes.filter((item) => !item.excluded);
    } 
    else if (query.length > 60) {
      const exactMatch = this.allNotes.find(
        (item) => item.note.getPath().toLowerCase() === query.toLowerCase()
      );
      if (exactMatch) {
        results = [exactMatch];
      } else {
        results = this.allNotes.filter((item) =>
          item.note.getPath().toLowerCase().includes(query.toLowerCase())
        );
      }
    } 
    else {
      const fuzzyResults = this.fuse.search(query);
      results = fuzzyResults.map((r) => ({ ...r.item, matches: r.matches }));
    }
  
    results.sort((a, b) => {
      if (a.excluded !== b.excluded) {
        return a.excluded ? 1 : -1;
      }
      return (
        a.note.getPath().toLowerCase().indexOf(query.toLowerCase()) -
        b.note.getPath().toLowerCase().indexOf(query.toLowerCase())
      );
    });
  
    const exactMatch = results.find(
      (item) => item.note.getPath().toLowerCase() === query.toLowerCase()
    );
  
    const lookupResults: LookupResult[] = results.slice(0, 10);
  
    if (!exactMatch && query.trim().length > 0) {
      lookupResults.unshift({ type: "create_new" });
    }
  
    return lookupResults;
  }
}
