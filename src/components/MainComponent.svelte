<script lang="ts">
  import NoteComponent from "./NoteComponent.svelte";
  import { structuredVaultList } from "../store";
  import { StructuredVault } from "../engine/structuredVault";
  import { Note } from "../engine/note";
  import { getIcon } from "obsidian";

  const children: Record<string, NoteComponent> = {};
  let collapseIcon: SVGElement;

  let pendingOpenNote: Note | null = null;

  export function collapseAllButTop() {
    Object.values(children).forEach((child) => child.collapseAllButTop());
  }

  function handleCollapseAllButTop() {
    collapseAllButTop();
  }

  function setCollapseIcon(node: HTMLElement) {
    const icon = getIcon("chevrons-down-up");
    if (icon) {
      icon.addClass("nav-action-icon");
      node.appendChild(icon);
    }
    return {
      destroy() {
        node.innerHTML = "";
      },
    };
  }

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
</script>

<div class="nav-header">
  <div class="nav-buttons-container">
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
      class="clickable-icon nav-action-button"
      on:click={handleCollapseAllButTop}
      aria-label="Collapse all except top level"
      title="Collapse all except top level"
      use:setCollapseIcon
    ></div>
  </div>
</div>

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
