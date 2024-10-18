<script lang="ts">
  import type { Action } from "svelte/types/runtime/action";
  import { slide } from "svelte/transition";
  import { Note } from "../engine/note";
  import { Menu, Platform, getIcon } from "obsidian";
  import { activeFile, getPlugin, showVaultPath } from "../store";
  import { OpenFileTarget, openFile } from "../utils";
  import { LookupModal } from "../modal/lookupModal";
  import { StructuredVault } from "../engine/structuredVault";
  import { createEventDispatcher, tick } from "svelte";
  import { RenameNoteModal } from "../modal/renameNoteModal";
  import type { SvelteComponent } from "svelte";

  export let note: Note;
  export let isRoot: boolean = false;
  export let vault: StructuredVault;

  let headerElement: HTMLDivElement;
  let isCollapsed = true;
  $: isActive = note.file && $activeFile === note.file;

  const icon: Action = function (node) {
    node.appendChild(getIcon("right-triangle")!);
  };

  function openNoteFile(target: undefined | OpenFileTarget) {
    openFile(getPlugin().app, note.file, { openTarget: target });
  }

  async function createCurrentNote() {
    const path = note.getPath(true);
    const plugin = getPlugin();
    const file = await vault.createNote(path);
    openFile(plugin.app, file);
    return file;
  }

  function deleteCurrentNote() {
    const plugin = getPlugin();
    if (!note.file) return;
    this.app.fileManager.trashFile(note.file);
  }

  function openLookup() {
    const plugin = getPlugin();
    plugin.openLookupWithCurrentPath();
  }

  function openRenameModal() {
    if (!note.file) return;
    const plugin = getPlugin();
    new RenameNoteModal(plugin.app, note.file, async (newName) => {
      await vault.noteRenamer.renameNote(note.file!, newName);
    }).open();
  }

  type FocusNotesFunction = (pathNotes: Note[]) => void;
  const childrenFocus: Record<string, FocusNotesFunction> = {};
  const childrenComponents: Record<string, SvelteComponent> = {};

  export function collapseAllButTop() {
    if (!isRoot) {
      isCollapsed = true;
    }
    Object.values(childrenComponents).forEach((child) => {
      if (typeof child.collapseAllButTop === "function") {
        child.collapseAllButTop();
      }
    });
  }

  async function handleDoubleClick() {
    if (!note.file) {
      const file = await createCurrentNote();
      note.file = file;
      note = note;
    }
  }

  function openMenu(e: MouseEvent) {
    const menu = new Menu();

    if (note.file) {
      menu.addItem((item) => {
        item
          .setTitle("Open in new tab")
          .setIcon("lucide-file-plus")
          .onClick(() => openNoteFile("new-tab"));
      });

      menu.addItem((item) => {
        item
          .setTitle("Open to the right")
          .setIcon("lucide-separator-vertical")
          .onClick(() => openNoteFile("new-leaf"));
      });

      if (Platform.isDesktopApp) {
        menu.addItem((item) => {
          item
            .setTitle("Open in new window")
            .setIcon("lucide-maximize")
            .onClick(() => openNoteFile("new-window"));
        });
      }
      menu.addSeparator();

      menu.addItem((item) => {
        item.setTitle("Rename Note").setIcon("pencil").onClick(openRenameModal);
      });

      menu.addSeparator();
    }

    if (!note.file) {
      menu.addItem((item) => {
        item.setTitle("Create current note").setIcon("create-new").onClick(createCurrentNote);
      });
    }

    menu.addItem((item) => {
      item.setTitle("Create new note").setIcon("plus").onClick(openLookup);
    });

    if (note.file)
      menu.addItem((item) => {
        item.setTitle("Delete note").setIcon("trash").onClick(deleteCurrentNote);
      });

    menu.showAtMouseEvent(e);
  }

  let expandTransitionWaiter: Promise<void> = Promise.resolve();
  let expandTransitionEnd: (value: void) => void;
  function expandTransitionStart() {
    expandTransitionWaiter = new Promise((resolve) => {
      expandTransitionEnd = resolve;
    });
  }

  export const focusNotes: FocusNotesFunction = async (pathNotes: Note[]) => {
    const nextNote = pathNotes.shift();

    if (nextNote) {
      isCollapsed = false;
      await tick();

      const focusFN = childrenFocus[nextNote.name];
      if (!focusFN) return;

      if (pathNotes.length === 0) await expandTransitionWaiter;

      focusFN(pathNotes);
    } else
      headerElement.scrollIntoView({
        block: "center",
      });
  };

  interface $$Events {
    openNote: CustomEvent<Note>;
  }

  const dispatcher = createEventDispatcher();
</script>

<div class="tree-item is-clickable" class:is-collapsed={isCollapsed}>
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div
    class="tree-item-self is-clickable mod-collapsible is-active"
    class:is-active={isActive}
    on:click={() => {
      dispatcher("openNote", note);
      openNoteFile(undefined);
      isCollapsed = false;
    }}
    on:dblclick={handleDoubleClick}
    on:contextmenu={openMenu}
    bind:this={headerElement}
  >
    {#if note.children.length > 0}
      <div
        class="tree-item-icon collapse-icon"
        class:is-collapsed={isCollapsed}
        use:icon
        on:click|stopPropagation={() => {
          isCollapsed = !isCollapsed;
        }}
      />
    {/if}
    <div class="tree-item-inner">
      {note.title + (isRoot && $showVaultPath ? ` (${vault.config.name})` : "")}
    </div>
    {#if !note.file}
      <div class="structured-tree-not-found" />
    {/if}
  </div>
  {#if note.children.length > 0 && !isCollapsed}
    <div
      class="tree-item-children"
      transition:slide={{ duration: 100 }}
      on:introstart={expandTransitionStart}
      on:introend={() => {
        expandTransitionEnd();
      }}
    >
      {#each note.children as child (child.name)}
        <svelte:self
          note={child}
          {vault}
          bind:focusNotes={childrenFocus[child.name]}
          bind:this={childrenComponents[child.name]}
          on:openNote
        />
      {/each}
    </div>
  {/if}
</div>
