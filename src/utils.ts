import { App, OpenViewState, TAbstractFile, TFile, Vault, Platform } from "obsidian";
import { customAlphabet as nanoid } from "nanoid";
import { exec } from "child_process";

export function getFolderFile(vault: Vault, path: string) {
  return path.length === 0 ? vault.getRoot() : vault.getAbstractFileByPath(path);
}

export type OpenFileTarget = "new-tab" | "new-leaf" | "new-window";

export function openFile(
  app: App,
  file: TAbstractFile | undefined | null,
  props: {
    openState?: OpenViewState;
    openTarget?: OpenFileTarget;
  } = {}
) {
  if (!file || !(file instanceof TFile)) return;
  const leaf =
    props.openTarget === "new-window"
      ? app.workspace.openPopoutLeaf()
      : props.openTarget === "new-leaf"
        ? app.workspace.createLeafBySplit(app.workspace.getLeaf())
        : app.workspace.getLeaf(props.openTarget === "new-tab");
  return leaf.openFile(file, props.openState);
}

const alphanumericLowercase = "0123456789abcdefghijklmnopqrstuvwxyz";
export const generateUUID = nanoid(alphanumericLowercase, 23);

// Check the current platform
export function isDesktopApp(): boolean {
  return Platform.isDesktop;
}

export function showInSystemExplorer(app: App, relativePath: string): void {
  if (!isDesktopApp()) return;

  // Get vault path using correct API method
  const vaultPath = (app.vault.adapter as any).getBasePath?.();
  if (!vaultPath) {
    console.error('Unable to get vault path');
    return;
  }

  const absolutePath = `${vaultPath}/${relativePath}`;

  if (Platform.isWin) {
    // Normalize path for Windows
    const windowsPath = absolutePath.replace(/\//g, '\\');
    exec(`explorer.exe /select,"${windowsPath}"`, (error) => {
      if (error) console.error('Failed to open explorer:', error);
    });
  } else if (Platform.isMacOS) {
    exec(`open -R "${absolutePath}"`, (error) => {
      if (error) console.error('Failed to open finder:', error);
    });
  } else if (Platform.isLinux) {
    const dirPath = absolutePath.substring(0, absolutePath.lastIndexOf('/'));
    exec(`xdg-open "${dirPath}"`, (error) => {
      if (error) console.error('Failed to open file manager:', error);
    });
  }
}
