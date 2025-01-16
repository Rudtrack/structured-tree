import { App, Notice, normalizePath } from "obsidian";
import { StructuredWorkspace } from "../engine/structuredWorkspace";
import { SelectVaultModal } from "../modal/selectVaultModal";

export function moveNoteCommand(app: App, workspace: StructuredWorkspace) {
    return {
        id: "structured-tree-move-note",
        name: "Move Note to Another Vault",
        callback: () => moveFileToVault(app, workspace),
    };
}

async function moveFileToVault(app: App, workspace: StructuredWorkspace) {
    const activeFile = app.workspace.getActiveFile();
    if (!activeFile) {
        new Notice("No file is currently open");
        return;
    }

    const sourceVault = workspace.findVaultByParent(activeFile.parent);
    if (!sourceVault) {
        new Notice("Current file is not in a structured vault");
        return;
    }

    new SelectVaultModal(
        app,
        workspace,
        async (targetVault) => {
            if (!targetVault.folder) {
                new Notice("Target vault folder not found");
                return;
            }

            const normalizedTargetPath = normalizePath(
                `${targetVault.folder.path}/${activeFile.name}`
            );
            
            try {
                await app.fileManager.renameFile(activeFile, normalizedTargetPath);
                sourceVault.tree.deleteByFileName(activeFile.basename, workspace.settings);
                const targetFile = app.vault.getAbstractFileByPath(normalizedTargetPath);
                if (targetFile) {
                    targetVault.onFileCreated(targetFile);
                    new Notice(`Moved ${activeFile.name} to ${targetVault.config.name}`);
                } else {
                    new Notice("Failed to find the target file in the vault");
                }
            } catch (error) {
                new Notice(`Failed to move file: ${error}`);
            }
        }
    ).open();
}