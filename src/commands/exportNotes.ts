import { App, Notice, TFile, TFolder } from "obsidian";
import { StructuredWorkspace } from "../engine/structuredWorkspace";
import { StructuredTreePluginSettings } from "../settings";
import { Note } from "../engine/note";
import { normalizePath } from "obsidian";

export function exportNotesCommand(
  app: App,
  workspace: StructuredWorkspace,
  settings: StructuredTreePluginSettings
) {
  return {
    id: "structured-tree-export-notes",
    name: "Export hierarchy as folders",
    callback: () => exportNotesToStandardStructure(app, workspace, settings),
  };
}

async function exportNotesToStandardStructure(
  app: App,
  workspace: StructuredWorkspace,
  settings: StructuredTreePluginSettings
) {
  try {
    new Notice("Starting export to standard structure...");

    const exportFolder = await createExportFolder(app);
    let exportedCount = 0;
    let failedCount = 0;

    for (const vault of workspace.vaultList) {
      if (!vault.isIniatialized) continue;
      
      const vaultExportFolder = await app.vault.createFolder(
        normalizePath(`${exportFolder.path}/${vault.config.name}`)
      );

      // Export the tree structure starting from root notes
      const rootNotes = vault.tree.root.children;

      for (const rootNote of rootNotes) {
        try {
          const exported = await exportNoteWithHierarchy(app, rootNote, vaultExportFolder, settings, "");
          exportedCount += exported;
        } catch (error) {
          console.error(`Failed to export note hierarchy starting from ${rootNote.title}:`, error);
          failedCount++;
        }
      }
    }

    if (exportedCount > 0) {
      new Notice(`Successfully exported ${exportedCount} notes to ${exportFolder.path}`);
    }
    if (failedCount > 0) {
      new Notice(`Failed to export ${failedCount} notes`);
    }
  } catch (error) {
    new Notice(`Export failed: ${error}`);
  }
}

async function exportNoteWithHierarchy(
  app: App,
  note: Note,
  parentFolder: TFolder,
  settings: StructuredTreePluginSettings,
  pathPrefix: string
): Promise<number> {
  let exportedCount = 0;

  // Get the title from frontmatter or use note title
  const title = note.title;
  const sanitizedTitle = sanitizeFileName(title);
  const hasChildren = note.children.length > 0;
  
  let currentFolder = parentFolder;
  let noteFilePath: string;

  if (hasChildren) {
    // Create a folder for this note since it has children
    const folderPath = normalizePath(`${parentFolder.path}/${sanitizedTitle}`);
    try {
      currentFolder = await app.vault.createFolder(folderPath);
    } catch (error) {
      // Folder might already exist
      currentFolder = app.vault.getAbstractFileByPath(folderPath) as TFolder;
    }

    // If this note has a file, place it in the folder with the same name
    if (note.file) {
      noteFilePath = normalizePath(`${currentFolder.path}/${sanitizedTitle}.${note.file.extension}`);
      noteFilePath = await getUniqueFilePath(app, noteFilePath);
      
      const content = await app.vault.read(note.file);
      await app.vault.create(noteFilePath, content);
      exportedCount++;
    }

    // Export all children in this folder
    for (const childNote of note.children) {
      const childExported = await exportNoteWithHierarchy(
        app, 
        childNote, 
        currentFolder, 
        settings, 
        `${pathPrefix}${sanitizedTitle}/`
      );
      exportedCount += childExported;
    }
  } else {
    // This is a leaf note, just export the file directly in the current folder
    if (note.file) {
      noteFilePath = normalizePath(`${parentFolder.path}/${sanitizedTitle}.${note.file.extension}`);
      noteFilePath = await getUniqueFilePath(app, noteFilePath);
      
      const content = await app.vault.read(note.file);
      await app.vault.create(noteFilePath, content);
      exportedCount++;
    }
  }

  return exportedCount;
}

async function createExportFolder(app: App): Promise<TFolder> {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, "-");
  const exportPath = `Exported Notes ${timestamp}`;
  
  try {
    return await app.vault.createFolder(exportPath);
  } catch (error) {
    throw new Error(`Failed to create export folder: ${error}`);
  }
}

function sanitizeFileName(title: string): string {
  // Remove or replace characters that are not allowed in filenames
  return title
    .replace(/[<>:"/\\|?*]/g, "") // Remove invalid characters
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

async function getUniqueFilePath(app: App, basePath: string): Promise<string> {
  let counter = 1;
  let targetPath = basePath;
  
  while (await app.vault.adapter.exists(targetPath)) {
    const pathParts = basePath.split(".");
    const extension = pathParts.pop();
    const nameWithoutExt = pathParts.join(".");
    targetPath = `${nameWithoutExt} (${counter}).${extension}`;
    counter++;
  }
  
  return targetPath;
}