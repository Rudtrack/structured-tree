import { App } from "obsidian";
import { LookupModal } from "../modal/lookupModal";
import { StructuredWorkspace } from "../engine/structuredWorkspace";

export function lookupNoteCommand(app: App, workspace: StructuredWorkspace) {
  return {
    id: "structured-lookup",
    name: "Lookup note",
    callback: () => {
      new LookupModal(app, workspace).open();
    },
  };
}
