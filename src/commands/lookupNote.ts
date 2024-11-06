import { App } from "obsidian";
import { LookupModal } from "../modal/lookup/lookupModal";
import { StructuredWorkspace } from "../engine/structuredWorkspace";
import { StructuredTreePluginSettings } from "../settings";

export function lookupNoteCommand(app: App, workspace: StructuredWorkspace, settings: StructuredTreePluginSettings) {
  return {
    id: "structured-lookup",
    name: "Lookup note",
    callback: () => {
      new LookupModal(app, workspace, "", settings.excludedPaths).open();
    },
  };
}
