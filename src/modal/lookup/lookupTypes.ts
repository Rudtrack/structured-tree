import { FuseResultMatch } from 'fuse.js';
import { Note } from "../../engine/note";
import { StructuredVault } from "../../engine/structuredVault";

export interface LookupItem {
  note: Note;
  vault: StructuredVault;
  matches?: readonly FuseResultMatch[];
  excluded: boolean;
}

export type LookupResult = LookupItem | { type: 'create_new' };
