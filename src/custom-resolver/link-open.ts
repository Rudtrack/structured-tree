import { Notice, Workspace } from "obsidian";
import { anchorToLinkSubpath } from "src/engine/ref";
import { StructuredWorkspace } from "src/engine/structuredWorkspace";

export function createLinkOpenHandler(
  workspace: StructuredWorkspace,
  originalBoundedFunction: Workspace["openLinkText"]
): Workspace["openLinkText"] {
  return async (linktext, sourcePath, newLeaf, openViewState) => {
    const target = workspace.resolveRef(sourcePath, linktext);

    if (!target || target.type !== "maybe-note")
      return originalBoundedFunction(linktext, sourcePath, newLeaf, openViewState);

    let file = target.note?.file;

    if (!file) {
      if (target.vaultName === "") {
        new Notice("Vault name is unspecified in link.");
        return;
      } else if (!target.vault) {
        new Notice(`Vault ${target.vaultName} is not found.`);
        return;
      } else if (target.path === "") {
        new Notice("Note path is unspecified in link.");
        return;
      }

      file = await target.vault.createNote(target.path);
    }

    let newLink = file.path;
    if (target.subpath)
      newLink += anchorToLinkSubpath(
        target.subpath.start,
        this.app.metadataCache.getFileCache(file)?.headings
      );
    return originalBoundedFunction(newLink, "", newLeaf, openViewState);
  };
}
