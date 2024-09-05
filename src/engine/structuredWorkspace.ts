import { App, TFolder, parseLinktext } from 'obsidian';
import { StructuredVault, VaultConfig } from './structuredVault';
import { getFolderFile } from '../utils';
import { RefTarget, parseRefSubpath } from './ref';
import { parsePath } from '../path';
import { StructuredTreePluginSettings } from '../settings';

export const STRUCTURED_URI_START = 'structured://';

export class StructuredWorkspace {
	vaultList: StructuredVault[] = [];

	constructor(
		private app: App,
		private settings: StructuredTreePluginSettings
	) {}

	changeVault(configs: VaultConfig[]) {
		this.vaultList = configs.map((config) => new StructuredVault(this.app, config, this.settings));
		this.vaultList.forEach((vault) => vault.init());
	}

	findVaultByParent(parent: TFolder | null): StructuredVault | undefined {
		return this.vaultList.find((vault) => vault.folder === parent);
	}

	findVaultByParentPath(path: string): StructuredVault | undefined {
		const file = getFolderFile(this.app.vault, path);
		return file instanceof TFolder ? this.findVaultByParent(file) : undefined;
	}

	resolveRef(sourcePath: string, link: string): RefTarget | null {
		if (link.startsWith(STRUCTURED_URI_START)) {
			const [vaultName, rest] = link.slice(STRUCTURED_URI_START.length).split('/', 2) as (
				| string
				| undefined
			)[];
			const { path, subpath } = rest
				? parseLinktext(rest)
				: {
						path: undefined,
						subpath: undefined,
					};
			const vault = this.vaultList.find(({ config }) => config.name === vaultName);

			return {
				type: 'maybe-note',
				vaultName: vaultName ?? '',
				vault,
				note: path ? vault?.tree?.getFromFileName(path) : undefined,
				path: path ?? '',
				subpath: subpath ? parseRefSubpath(subpath) : undefined,
			};
		}
		const { dir: vaultDir } = parsePath(sourcePath);
		const vault = this.findVaultByParentPath(vaultDir);

		if (!vault) return null;

		const { path: linkPath, subpath } = parseLinktext(link);
		const target = this.app.metadataCache.getFirstLinkpathDest(linkPath, sourcePath);

		if (target && target.extension !== 'md')
			return {
				type: 'file',
				file: target,
			};

		const path = target ? target.basename : linkPath;
		const note = vault.tree.getFromFileName(path);
		return {
			type: 'maybe-note',
			vaultName: vault.config.name,
			vault: vault,
			note,
			path,
			subpath: parseRefSubpath(subpath.slice(1) ?? ''),
		};
	}
}
