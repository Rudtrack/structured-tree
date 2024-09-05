<script lang="ts">
  import NoteComponent from "./NoteComponent.svelte";
  import { structuredVaultList } from "../store";
  import { StructuredVault } from "../engine/structuredVault";
  import { Note } from "../engine/note";

  const children: Record<string, NoteComponent> = {};

  let pendingOpenNote: Note | null = null;

  export function focusTo(vault: StructuredVault, note: Note) {
    if (pendingOpenNote === note) {
      pendingOpenNote = null;
      return;
    }
    const vaultComponent = children[vault.config.name];
    if (!vaultComponent) return;

    const pathNotes = note.getPathNotes();
    pathNotes.shift();
    vaultComponent.focusNotes(pathNotes);
  }

  function onOpenNote(e: CustomEvent<Note>) {
    pendingOpenNote = e.detail;
  }

  export function collapseAllButTop() {
    Object.values(children).forEach((child) => child.collapseAllButTop());
  }
</script>

<div>
  {#each $structuredVaultList as vault (vault.config.name)}
    <NoteComponent
      note={vault.tree.root}
      isRoot
      {vault}
      bind:this={children[vault.config.name]}
      on:openNote={onOpenNote}
    />
  {/each}
</div>
