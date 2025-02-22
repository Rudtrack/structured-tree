# Changelog

## 3.0.0

- Tabluated the settings menu to make it easier to navigate.
- Secret Vault: Notes in a secret vault will not show up in lookup results.
- Vault Override Settings: Vaults can now have their own settings for properties that will override the global settings for that vault
- Existing Vaults can now be edited.
- Better disclaimer for experimental features.

## 2.2.1

- Reorganized the settings menu into tabs.
- Improved the codebase with better formatting.

## 2.2.0

- You can now change the icon of the plugin through the settings (Thanks to [N2Thghm](https://github.com/n2thghm)).
- Right-click now has an option for opening the file in the default system explorer.
- Non-existing notes in the hierarchy will now have a "+" icon in lookup, similar to "Create New Note".

## 2.1.0

- It's now possible to use a custom hierarchy separator. Change it in the plugin settings. As default, `.` is used as the separator.
- A new command and right-click option for moving notes to another vault.
- A note will now be put into the relevant vault depending on active note or which vault the right-clicked note is already in.
- Users can now tune their own Fuzzy search variables in the settings.
- Backlinks between vaults will now work in the same way as links within the same vault
  - LIMITATION: If two vaults have a file with the exact same name, the backlink will only work on the file with the shortest file path.

## 2.0.6

- Fixed a bug that would cause the "Collapse All" command to add 3 additional lines at the top of the currently active file

## 2.0.5

- Tuned fuzzy search in lookup to prioritize sequential matches

## 2.0.4

- Fixed a bug that prevented renaming for working on mobile.
- Added command to open structured tree in sidebar.

## 2.0.3

- Fixed a bug that auto-revealed the pane with Structured Tree on it when moving to a new note and the "Reveal File" option was enabled in the settings.

## 2.0.2

- Updated Obsidian API and made code changes in according to their suggestions.

## 2.0.1

- Added debouncing to the lookup modal to improve performance when typing quickly or having long queries.

## 2.0.0

- New Features:
  - Excluded Paths: Paths that match these patterns will be grey and at the bottom of Lookup searches.
  - Open Parent: Triggered from the command palette, this will open the parent of the currently active note.
- Bug fixes:
  - Lookup should now highlight relevant characters in the file name.
  - Increased performance for the lookup modal.
- Refactored large parts of the codebase to improve readability and maintainability.
- Stability improvements.
- Updated ReadMe.

## 1.7.3

- Fixed a bug in the custom resolver that stopped it from showing previews for specific headings.
- Lookup should now properly work when searching for file name instead of title.
  - Fuzzy search still works on the file name, but it will not highlight the matching characters.
- Rename modal should now better handle if part of the file name is also in the path for the file.

## 1.7.2

- Fixed a bug that would sort the note based on the file name rather than title after a rename.

## 1.7.1

- Fixed a bug that auto-filled the open note rather than the right-clicked note when trying to create a new note through the right-click menu.

## 1.7.0

- Added fuzzy search with highlighting of matching characters.
- When creating a new note, the lookup should automatically add the "." at the end of the current path.
- Behind-the-scenes updates to the codebase.

## 1.6.0

- Fixed a bug where the `id` key would not be reset when clicking "Reset Properties" button in settings.
- Added `title` and `desc` to the properties that can be toggled on or off.
- You can now change the key for `created` the same way as `id`, `title` and `desc`.
- Choose between Unix and "YYYY-MM-DD" timestamps for `created` in the settings.
- Added a button in the settings to automatically set correct options to keep compatibility with Dendron.
- Added confirmation dialog when resetting properties or setting Dendron compatibility options.
- A new command for creating a note will open lookup with the currently open note name auto-filled.
- Fixed a bug that could cause a crash if title was number type.
- Custom local graph now shows connections between notes that are related with their file names
  - The local graph currently requires you to click a node before it will use the custom graph. This is a know issue and will be fixed in a future update.
  - The Custom Graph remains experiemantal.

## 1.5.2

- Small bugfixes and behind the scenes improvements.

## 1.5.1

- Small bugfixes

## 1.5.0

- Added support for generating ID on existing notes through "Generate ID" in the command palette.
- Added support for collapsing all levels except the top level through "Collapse All" in the command palette.
- You can now double-click on missing files in the tree to create the file.

## 1.4.2

- Refactored names of files to better conform to best practices.
- Added prettier config for more consistent code formatting.

## 1.4.1

- Updated ReadMe.md.
- Disabled spell-checking for lookup input field.
- Minor bugfixes and behind-the-scenes improvements.

## 1.4.0

- Implemented a built-in way of renaming notes.
  - It will automatically rename files below in the hierarchy.
  - Can be accessed either through the Command Palette or by right-clicking on a note in the tree view and selecting "Rename Note".
  - Will not allow you to rename a note to a name that already exists in the vault.
- Moved Canvas support to experimental as it is not fully supported by this plugin yet.

## 1.3.0

- Reworked the "Auto-generate Properties" setting.
  - ID generation is now optional.
  - Can optionally create a `tags` property.
  - A `created` property can be optionally created with the current date.
  - It will use the user-selected keys for title and description. If the keys are not present, it will default to `title` and `desc`.
  - It now generates a title based on the file name.

## 1.2.0

- Redesigned Lookup to include the contents of the description property.
- Set custom Properties key for title and description.
- Small bug fixes.

## 1.1.0

- Added support for all file types supported by Obsidian, including Canvas.
- Small bug and grammatical fixes.

## 1.0.4

- Small, behind-the-scenes changes to comply with Obsidian review.

## 1.0.3

- Behind-the-scenes improvements to streamline the codebase.

## 1.0.2

- Updated manifest version number.

## 1.0.1

- Updated ReadMe to give credit to original repo.

## 1.0.0

Initial Release:

- Forked from [Obsidian Dendron Tree](https://github.com/levirs565/obsidian-dendron-tree) by [levirs565](https://github.com/levirs565).
- Added setting to choose how files are deleted.
