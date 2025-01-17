import { App, Notice, normalizePath, TFile } from "obsidian";
import { StructuredWorkspace } from "../engine/structuredWorkspace";
import { SelectVaultModal } from "../modal/selectVaultModal";

export function moveNoteCommand(app: App, workspace: StructuredWorkspace) {
  return {
    id: "structured-tree-move-file",
    name: "Move File to Another Vault",
    callback: () => moveNoteToVault(app, workspace),
  };
}

export async function moveNoteToVault(app: App, workspace: StructuredWorkspace, file?: TFile) {
  const activeFile = file || app.workspace.getActiveFile();
  if (!activeFile) {
    new Notice("No file is currently open");
    return;
  }

  const sourceVault = workspace.findVaultByParent(activeFile.parent);
  if (!sourceVault) {
    new Notice("Current file is not in a structured vault");
    return;
  }

  new SelectVaultModal(app, workspace, async (targetVault) => {
    if (!targetVault.folder) {
      new Notice("Target vault folder not found");
      return;
    }

    const normalizedTargetPath = normalizePath(`${targetVault.folder.path}/${activeFile.name}`);

    try {
      await app.fileManager.renameFile(activeFile, normalizedTargetPath);
      sourceVault.tree.deleteByFileName(activeFile.basename, workspace.settings);
      const targetFile = app.vault.getAbstractFileByPath(normalizedTargetPath);
      if (targetFile) {
        targetVault.onFileCreated(targetFile);
        new Notice(`Moved ${activeFile.name} to ${targetVault.config.name}`);
      }
    } catch (error) {
      new Notice(`Failed to move file: ${error}`);
    }
  }).open();
}
