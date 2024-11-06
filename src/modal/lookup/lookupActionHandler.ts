import { App } from "obsidian";
import { LookupResult } from "./lookupTypes";
import { StructuredVault } from "../../engine/structuredVault";
import { StructuredWorkspace } from "../../engine/structuredWorkspace";
import { SelectVaultModal } from "../selectVaultModal";
import { openFile } from "../../utils";
import { LookupUtils } from "./lookupUtils";

export class LookupActionHandler {
  constructor(
    private app: App,
    private workspace: StructuredWorkspace
  ) {}

  async onChooseSuggestion(item: LookupResult, inputValue: string) {
    if (LookupUtils.isLookupItem(item) && item.note.file) {
      openFile(this.app, item.note.file);
      return;
    }

    const path = LookupUtils.isLookupItem(item) ? item.note.getPath() : inputValue;

    const doCreate = async (vault: StructuredVault) => {
      const file = await LookupUtils.createNote(vault, path);
      return openFile(vault.app, file);
    };

    if (LookupUtils.isLookupItem(item) && item.vault) {
      await doCreate(item.vault);
    } else if (this.workspace.vaultList.length == 1) {
      await doCreate(this.workspace.vaultList[0]);
    } else {
      new SelectVaultModal(this.app, this.workspace, doCreate).open();
    }
  }
}
