import { App, Notice } from "obsidian";
import { StructuredWorkspace } from "../engine/structuredWorkspace";
import { generateUUID } from "../utils";

export function generateIdCommand(app: App, workspace: StructuredWorkspace, settings: { idKey: string }, updateNoteStore: () => void) {
  return {
    id: "generate-id-for-note",
    name: "Generate ID",
    callback: () => addIdToCurrentNote(app, workspace, settings, updateNoteStore),
  };
}

async function addIdToCurrentNote(app: App, workspace: StructuredWorkspace, settings: { idKey: string }, updateNoteStore: () => void) {
  const activeFile = app.workspace.getActiveFile();
  if (!activeFile) {
    new Notice("No active file");
    return;
  }

  const vault = workspace.findVaultByParent(activeFile.parent);
  if (!vault) {
    new Notice("File is not in a structured vault");
    return;
  }

  const fileContents = await app.vault.read(activeFile);
  const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
  const frontmatterMatch = fileContents.match(frontmatterRegex);

  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    const frontmatterLines = frontmatter.split("\n");
    const idLine = `${settings.idKey}: "${generateUUID()}"`;

    if (!frontmatterLines.some((line) => line.startsWith(`${settings.idKey}:`))) {
      frontmatterLines.unshift(idLine);
      const newFrontmatter = frontmatterLines.join("\n");
      const newContents = fileContents.replace(frontmatterRegex, `---\n${newFrontmatter}\n---`);

      await app.vault.modify(activeFile, newContents);
      new Notice("ID generated");

      vault.onMetadataChanged(activeFile);
      updateNoteStore();
    } else {
      new Notice("Note already has an ID");
    }
  } else {
    // If no frontmatter exists, create one with the ID
    const newContents = `---\n${settings.idKey}: "${generateUUID()}"\n---\n\n${fileContents}`;
    await app.vault.modify(activeFile, newContents);
    new Notice("ID generated");

    vault.onMetadataChanged(activeFile);
    updateNoteStore();
  }
}
