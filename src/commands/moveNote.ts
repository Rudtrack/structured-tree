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

export async function moveNotesToVault(
  app: App, 
  workspace: StructuredWorkspace, 
  files: TFile[]
) {
  if (files.length === 0) {
    new Notice("No files selected");
    return;
  }

  // Validate all files are in structured vaults
  const sourceVaults = files.map(file => workspace.findVaultByParent(file.parent));
  if (sourceVaults.some(vault => !vault)) {
    new Notice("Some files are not in structured vaults");
    return;
  }

  new SelectVaultModal(app, workspace, async (targetVault) => {
    if (!targetVault.folder) {
      new Notice("Target vault folder not found");
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const file of files) {
      const sourceVault = workspace.findVaultByParent(file.parent);
      if (!sourceVault) continue;

      const normalizedTargetPath = normalizePath(`${targetVault.folder.path}/${file.name}`);

      try {
        await app.fileManager.renameFile(file, normalizedTargetPath);
        sourceVault.tree.deleteByFileName(file.basename, workspace.settings);
        const targetFile = app.vault.getAbstractFileByPath(normalizedTargetPath);
        if (targetFile) {
          targetVault.onFileCreated(targetFile);
          successCount++;
        }
      } catch (error) {
        failCount++;
      }
    }

    if (successCount > 0) {
      new Notice(`Moved ${successCount} files to ${targetVault.config.name}`);
    }
    if (failCount > 0) {
      new Notice(`Failed to move ${failCount} files`);
    }
  }).open();
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
