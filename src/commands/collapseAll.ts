import { App } from "obsidian";
import { StructuredView, VIEW_TYPE_STRUCTURED } from "../view";

export function collapseAllCommand(app: App) {
  return {
    id: "structured-tree-collapse-all",
    name: "Collapse all",
    callback: () => collapseAllButTop(app),
  };
}

function collapseAllButTop(app: App) {
  app.workspace.getLeavesOfType(VIEW_TYPE_STRUCTURED).forEach((leaf) => {
    if (leaf.view instanceof StructuredView) {
      leaf.view.collapseAllButTop();
    }
  });
}
