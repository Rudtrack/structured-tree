import { GraphNode } from "obsidian";
import { STRUCTURED_URI_START, StructuredWorkspace } from "src/engine/structuredWorkspace";

export function createNodeTextHandler(workspace: StructuredWorkspace): GraphNode["getDisplayText"] {
  return function (this: GraphNode): string {
    const id = this.id;
    if (id.startsWith(STRUCTURED_URI_START)) {
      const ref = workspace.resolveRef("", id);
      if (!ref || ref.type === "file") return id;

      const title = ref.note?.title ?? ref.path;
      if (workspace.vaultList.length > 1) return `${title} (${ref.vaultName})`;

      return title;
    } else {
      // For non-structured nodes (like attachments), use the basename without extension
      const parts = id.split('/');
      const filename = parts[parts.length - 1];
      return filename.split('.').slice(0, -1).join('.') || filename;
    }
  };
}
