import Fuse from "fuse.js";
import { LookupItem, LookupResult } from "./lookupTypes";
import { StructuredWorkspace } from "../../engine/structuredWorkspace";
import { isPathExcluded } from "src/pathExclusion";

export class LookupSuggestionManager {
  private fuse: Fuse<LookupItem>;
  private allNotes: LookupItem[];

  constructor(
    private workspace: StructuredWorkspace,
    private excludedPaths: string[] = []
  ) {
    this.initializeNotes();
    this.initializeFuse();
  }

  private initializeNotes() {
    this.allNotes = this.workspace.vaultList.flatMap((vault) =>
      vault.tree.flatten().map((note) => ({
        note,
        vault,
        excluded: isPathExcluded(note.getPath(), this.excludedPaths),
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
  }

  private initializeFuse() {
    this.fuse = new Fuse(this.allNotes, {
      keys: [
        "note.title",
        "note.name",
        {
          name: "note.file.name",
          weight: 0.6,
        },
      ],
      includeScore: true,
      includeMatches: true,
      threshold: 0.2,
    });
  }

  getSuggestions(query: string): LookupResult[] {
    if (!query.trim()) {
      return this.allNotes.filter((item) => !item.excluded);
    }

    let result: LookupItem[];

    // For long queries, first try an exact match
    if (query.length > 60) {
      const exactMatch = this.allNotes.find(
        (item) => item.note.getPath().toLowerCase() === query.toLowerCase()
      );
      if (exactMatch) {
        result = [exactMatch];
      } else {
        // If no exact match, perform a more restrictive search
        result = this.allNotes.filter((item) =>
          item.note.getPath().toLowerCase().includes(query.toLowerCase())
        );
      }
    } else {
      // For shorter queries, use the full fuzzy search
      const fuzzyResults = this.fuse.search(query);
      result = fuzzyResults.map((r) => ({ ...r.item, matches: r.matches }));
    }

    // Sort results: non-excluded first, then by relevance
    result.sort((a, b) => {
      if (a.excluded !== b.excluded) {
        return a.excluded ? 1 : -1;
      }
      return (
        a.note.getPath().toLowerCase().indexOf(query.toLowerCase()) -
        b.note.getPath().toLowerCase().indexOf(query.toLowerCase())
      );
    });

    const exactMatch = result.find(
      (item) => item.note.getPath().toLowerCase() === query.toLowerCase()
    );

    // Convert result to LookupResult[]
    const lookupResults: LookupResult[] = result.slice(0, 10);

    // Add 'create new' option if there's no exact match and query is not empty
    if (!exactMatch && query.trim().length > 0) {
      lookupResults.unshift({ type: "create_new" });
    }

    return lookupResults;
  }
}
