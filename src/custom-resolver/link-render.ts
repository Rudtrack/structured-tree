import { App, TFile } from "obsidian";
import { StructuredWorkspace } from "../engine/structuredWorkspace";

export function renderLinkTitle(
  app: App,
  workspace: StructuredWorkspace,
  href: string,
  title: string | undefined,
  sourcePath: string
) {
  if (title) return title;

  const ref = workspace.resolveRef(sourcePath, href);
  if (!ref || ref.type !== "maybe-note") return href;

  // Check if we have a direct file reference
  if (ref.note?.file) {
    const fileTitle = app.metadataCache.getFileCache(ref.note.file)?.frontmatter?.["title"];
    return fileTitle ?? href;
  }

  // First check in the source vault
  const sourceVault = workspace.findVaultByParentPath(sourcePath);
  if (sourceVault) {
    const existingFile = sourceVault.folder.children.find(
      (file) => file instanceof TFile && file.name === `${ref.path}.md`
    );
    if (existingFile instanceof TFile) {
      const fileTitle = app.metadataCache.getFileCache(existingFile)?.frontmatter?.["title"];
      if (fileTitle) return fileTitle;
    }
  }

  // Then check other vaults
  const matchingFiles: TFile[] = [];
  for (const vault of workspace.vaultList) {
    if (vault === sourceVault) continue;
    
    const existingFile = vault.folder.children.find(
      (file) => file instanceof TFile && file.name === `${ref.path}.md`
    );
    if (existingFile instanceof TFile) {
      matchingFiles.push(existingFile);
    }
  }

  if (matchingFiles.length === 1) {
    const fileTitle = app.metadataCache.getFileCache(matchingFiles[0])?.frontmatter?.["title"];
    if (fileTitle) return fileTitle;
  }

  return href;
}