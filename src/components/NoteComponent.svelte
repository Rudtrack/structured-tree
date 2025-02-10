<script lang="ts">
  import type { Action } from "svelte/types/runtime/action";
  import { slide } from "svelte/transition";
  import { Note } from "../engine/note";
  import { TFile,Menu, getIcon } from "obsidian";
  import { activeFile, getPlugin, showVaultPath } from "../store";
  import { OpenFileTarget, openFile } from "../utils";
  import { openLookupWithCurrentPath } from "../commands/createNewNote";
  import { StructuredVault } from "../engine/structuredVault";
  import { createEventDispatcher, tick } from "svelte";
  import { RenameNoteModal } from "../modal/renameNoteModal";
  import type { SvelteComponent } from "svelte";
  import { moveNotesToVault, moveNoteToVault } from "src/commands/moveNote";
  import { isDesktopApp, showInSystemExplorer } from "../utils";
  import { selectedNotes } from "../store";

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
    if (note.file) { // Add guard clause
      openFile(getPlugin().app, note.file, { openTarget: target });
    }
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
    const initialPath = note.getPath(true) + ".";
    openLookupWithCurrentPath(plugin.app, plugin.workspace, initialPath, vault);
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
  
  // Add null check and type guard
  Object.values(childrenComponents).forEach((child) => {
    if (child && typeof child.collapseAllButTop === "function") {
      try {
        child.collapseAllButTop();
      } catch (e) {
        console.warn("Failed to collapse child component", e);
      }
    }
  });
}

  let isSelected = false;
  $: isSelected = $selectedNotes.includes(note);

  function handleClick(event: MouseEvent) {
  if (event.ctrlKey || event.shiftKey) {
    // Only allow selection of existing notes
    if (!note.file) return;

    if (event.ctrlKey) {
      // If this is the first selection and there's an active file
      if ($selectedNotes.length === 0 && $activeFile) {
        const activeNote = vault.tree.flatten().find(n => n.file === $activeFile);
        if (activeNote) {
          $selectedNotes = [activeNote];
        }
      }

      // Toggle selection
      if (isSelected) {
        $selectedNotes = $selectedNotes.filter(n => n !== note);
      } else {
        $selectedNotes = [...$selectedNotes, note];
      }
    } else if (event.shiftKey) {
      // If no selection yet, start from active file
      if ($selectedNotes.length === 0 && $activeFile) {
        const activeNote = vault.tree.flatten().find(n => n.file === $activeFile);
        if (activeNote) {
          const notes = vault.tree.flatten().filter(n => n.file); // Only include existing notes
          const start = notes.indexOf(activeNote);
          const end = notes.indexOf(note);
          const range = notes.slice(Math.min(start, end), Math.max(start, end) + 1);
          $selectedNotes = range;
          return;
        }
      }

      // Existing shift-click logic with filter for existing notes
      const lastSelected = $selectedNotes[$selectedNotes.length - 1];
      const notes = vault.tree.flatten().filter(n => n.file); // Only include existing notes
      const start = notes.indexOf(lastSelected);
      const end = notes.indexOf(note);
      const range = notes.slice(Math.min(start, end), Math.max(start, end) + 1);
      $selectedNotes = [...new Set([...$selectedNotes, ...range])];
    }
  } else {
    // Normal click
    $selectedNotes = [];
    dispatcher("openNote", note);
    if (note.file) {
      openNoteFile(undefined);
    }
  }
  isCollapsed = false;
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

    if ($selectedNotes.length > 1 && isSelected) {
      // Get only valid notes (with files)
      const validSelectedNotes = $selectedNotes.filter(n => n.file);
      const validCount = validSelectedNotes.length;

      menu.addItem((item) => {
        item
          .setTitle(`Delete ${validCount} notes`)
          .setIcon("trash")
          .onClick(() => {
            const plugin = getPlugin();
            validSelectedNotes.forEach(note => {
              if (note.file) {
                plugin.app.fileManager.trashFile(note.file);
              }
            });
            $selectedNotes = [];
          });
      });

      menu.addItem((item) => {
        item
          .setTitle(`Move ${validCount} notes to vault`)
          .setIcon("folder-input")
          .onClick(() => {
            const plugin = getPlugin();
            const files = validSelectedNotes
              .map(n => n.file)
              .filter((f): f is TFile => f !== null);
            moveNotesToVault(plugin.app, plugin.workspace, files);
          });
      });

      menu.showAtMouseEvent(e);
      return;
  }

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

      if (isDesktopApp()) {
        menu.addItem((item) => {
          item
            .setTitle("Open in new window")
            .setIcon("lucide-maximize")
            .onClick(() => openNoteFile("new-window"));
        });
      }
      menu.addSeparator();

      menu.addItem((item) => {
        item.setTitle("Rename note")
        .setIcon("pencil")
        .onClick(openRenameModal);
      });

      menu.addItem((item) => {
        item
          .setTitle("Move to Vault")
          .setIcon("folder-input")
          .onClick(() => {
            const plugin = getPlugin();
            moveNoteToVault(plugin.app, plugin.workspace, note.file!);
          });
      });

      if (isDesktopApp()) {
      menu.addItem((item) => {
        item
          .setTitle("Show in system explorer")
          .setIcon("external-link")
          .onClick(() => showInSystemExplorer(getPlugin().app, note.file!.path));
      });
    }

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

    menu.addSeparator();

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
  class="tree-item-self is-clickable mod-collapsible"
  class:is-active={isActive}
  class:is-selected={isSelected}
  on:click={handleClick}
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
