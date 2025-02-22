import { TFile } from "obsidian";
import { Note } from "src/engine/note";
import { StructuredVault } from "src/engine/structuredVault";

export type ConnectionType = {
  type: "backlink" | "hierarchy";
  sourceNode: string;
  targetNode: string;
  weight: number;
};

export type StructuredGraphNode = {
  file: TFile;
  connections: ConnectionType[];
} & (
  | {
      type: "note";
      vault: StructuredVault;
      note: Note;
    }
  | {
      type: "file";
    }
);
