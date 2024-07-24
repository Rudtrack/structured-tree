import { derived, get, writable } from "svelte/store";
import type StructuredTreePlugin from "./main";
import { TFile } from "obsidian";
import { StructuredVault } from "./engine/vault";

export const plugin = writable<StructuredTreePlugin>();
export const getPlugin = () => get(plugin);

export const activeFile = writable<TFile | null>();

export const structuredVaultList = writable<StructuredVault[]>([]);
export const getStructuredVaultList = () => get(structuredVaultList);

export const showVaultPath = derived(structuredVaultList, ($list) => $list.length > 1);
