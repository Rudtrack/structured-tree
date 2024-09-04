# Changelog

## 1.4.0

-   Implemented a built-in way of renaming notes.
    -   It will automatically rename files below in the hiearchy.
    -   Can be access either through the Command Palette or by right-clicking on a note in the tree view and selecting "Rename Note".
    -   Will not allow you to rename a note to a name that already exists in the vault.
-   Moved Canvas support to experimental as it is not fully supported by this plugin yet.

## 1.3.0

-   Reworked the "Auto-generate Properties" setting.
    -   ID generation is now optional.
    -   Can optionally create a `tags` property.
    -   A `created` property can be optionally created with the current date.
    -   It will use the user selected keys for title and description. If the keys are not present, it will default to `title` and `desc`.
    -   It now generates a title based on the file name.

## 1.2.0

-   Redesigned Lookup to include the contents of the description property.
-   Set custom Properties key for title and description.
-   Small bug fixes.

## 1.1.0

-   Added support for all file types supported by Obsidian, including Canvas.
-   Small bug and grammatical fixes

## 1.0.4

-   Small, behind-the-scenes changes to comply with Obsidian review

## 1.0.3

-   Behind-the-scenes improvements to streamline the codebase

## 1.0.2

-   Updated manifest version number

## 1.0.1

-   Updated ReadMe to give credit to original repo

## 1.0.0

Initial Release:

-   Forked from [Obsidian Dendron Tree](https://github.com/levirs565/obsidian-dendron-tree) by [levirs565](https://github.com/levirs565).
-   Added setting to choose how files are deleted
