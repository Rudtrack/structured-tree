import { App } from 'obsidian';
import { StructuredWorkspace } from '../engine/structuredWorkspace';

export function renderLinkTitle(
	app: App,
	workspace: StructuredWorkspace,
	href: string,
	title: string | undefined,
	sourcePath: string
) {
	if (title) {
		return title;
	}
	const ref = workspace.resolveRef(sourcePath, href);
	if (!ref || ref.type !== 'maybe-note' || !ref.note?.file) {
		return href;
	}

	const fileTitle = app.metadataCache.getFileCache(ref.note.file)?.frontmatter?.['title'];
	return fileTitle ?? href;
}
