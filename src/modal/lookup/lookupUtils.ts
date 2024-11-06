import { FuseResultMatch } from 'fuse.js';
import { LookupItem, LookupResult } from './lookupTypes';
import { StructuredVault } from '../../engine/structuredVault';

export class LookupUtils {
  static isLookupItem(item: LookupResult): item is LookupItem {
    return (item as LookupItem).note !== undefined;
  }

  static refreshNoteMetadata(item: LookupItem | null) {
    if (item && item.note.file) {
      const metadata = item.vault.resolveMetadata(item.note.file);
      if (metadata) {
        item.note.syncMetadata(metadata);
      }
    }
  }

  static highlightMatches(text: string, matches: readonly FuseResultMatch[] | undefined, keys: string[]): string | null {
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

  static async createNote(vault: StructuredVault, path: string) {
    return await vault.createNote(path);
  }
}
