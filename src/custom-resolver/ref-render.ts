import {
  App,
  ButtonComponent,
  MarkdownRenderChild,
  MarkdownRenderer,
  MarkdownRendererConstructorType,
  OpenViewState,
  TFile,
  setIcon,
} from "obsidian";
import { openFile } from "../utils";
import { MaybeNoteRef, RefRange, anchorToLinkSubpath } from "../engine/ref";
import { structuredActivityBarName } from "../icons";
import { StructuredTreePluginSettings } from "src/settings";

const MarkdownRendererConstructor = MarkdownRenderer as unknown as MarkdownRendererConstructorType;

class RefMarkdownRenderer extends MarkdownRendererConstructor {
  constructor(
    public parent: NoteRefRenderChild,
    queed: boolean
  ) {
    super(parent.app, parent.previewEl, queed);
  }

  get file(): TFile {
    return this.parent.file;
  }

  edit(markdown: string) {
    this.parent.editContent(markdown);
  }
}

export class NoteRefRenderChild extends MarkdownRenderChild {
  previewEl: HTMLElement;
  renderer: RefMarkdownRenderer;
  file: TFile;
  range: RefRange | null;
  markdown?: string;
  found = false;

  constructor(
    public readonly app: App,
    public readonly containerEl: HTMLElement,
    public readonly ref: MaybeNoteRef,
    settings: StructuredTreePluginSettings
  ) {
    super(containerEl);

    if (!ref.note || !ref.note.file)
      throw Error("NoteRefChild only accept ref with non-blank note and file");

    this.file = ref.note.file;

    this.containerEl.classList.add(
      "structured-embed",
      "markdown-embed",
      "inline-embed",
      "is-loaded"
    );
    this.containerEl.setText("");

    const icon = this.containerEl.createDiv("structured-icon");
    setIcon(icon, settings.pluginIcon);

    this.previewEl = this.containerEl.createDiv("markdown-embed-content");

    const buttonComponent = new ButtonComponent(this.containerEl);
    buttonComponent.buttonEl.remove();
    buttonComponent.buttonEl = this.containerEl.createDiv(
      "markdown-embed-link"
    ) as unknown as HTMLButtonElement;
    buttonComponent.setIcon("lucide-link").setTooltip("Open link");
    buttonComponent.buttonEl.onclick = () => {
      const openState: OpenViewState = {};
      if (this.ref.subpath) {
        openState.eState = {
          subpath: anchorToLinkSubpath(
            this.ref.subpath.start,
            this.app.metadataCache.getFileCache(this.file)?.headings
          ),
        };
      }
      openFile(this.app, this.ref.note?.file, { openState });
    };

    this.renderer = new RefMarkdownRenderer(this, true);
    this.addChild(this.renderer);
  }

  async getContent(): Promise<string> {
    const content = await this.app.vault.read(this.file);
    if (this.ref.subpath && this.ref.subpath.start && this.ref.subpath.start.type === "header") {
      const cache = this.app.metadataCache.getFileCache(this.file);
      if (cache && cache.headings) {
        const headingName = this.ref.subpath.start.name;
        const heading = cache.headings.find((h) => h.heading === headingName);
        if (heading) {
          const lines = content.split("\n");
          const startLine = heading.position.start.line;
          let endLine = lines.length;

          // Find the next heading of the same or lower level
          for (let i = startLine + 1; i < lines.length; i++) {
            if (
              cache.headings.some((h) => h.position.start.line === i && h.level <= heading.level)
            ) {
              endLine = i;
              break;
            }
          }

          return lines.slice(startLine, endLine).join("\n");
        }
      }
      // If we can't find the section, return an error message
      return `Cannot find section "${this.ref.subpath.start.name}" in ${this.file.basename}`;
    }
    return content;
  }

  editContent(target: string) {
    if (!this.found || !this.markdown) return;

    let md;
    if (!this.range) {
      md = target;
    } else {
      const before = this.markdown.substring(0, this.range.start);
      md = before + target;
      if (this.range.end) {
        const after = this.markdown.substring(this.range.end);
        md += after;
      }
    }
    this.app.vault.modify(this.file, md);
  }

  async loadFile() {
    const content = await this.getContent();
    this.renderer.renderer.set(content);
  }

  onload(): void {
    super.onload();
    this.registerEvent(
      this.app.metadataCache.on("changed", async (file, data) => {
        if (file === this.file) {
          this.loadFile();
        }
      })
    );
  }
}

export class UnresolvedRefRenderChild extends MarkdownRenderChild {
  constructor(
    app: App,
    containerEl: HTMLElement,
    target: MaybeNoteRef,
    settings: StructuredTreePluginSettings
  ) {
    super(containerEl);

    this.containerEl.classList.add("structured-embed", "file-embed", "mod-empty", "is-loaded");
    this.containerEl.setText("");

    const icon = this.containerEl.createDiv("structured-icon");
    setIcon(icon, settings.pluginIcon);
    const content = this.containerEl.createDiv();

    const { vaultName, vault, path } = target;

    if (vaultName === "") {
      content.setText("Vault name are unspecified in link.");
      return;
    } else if (!vault) {
      content.setText(`Vault ${vaultName} are not found.`);
      return;
    } else if (path === "") {
      content.setText("Note path are unspecified in link.");
      return;
    }
    content.setText(`"${target.path}" is not created yet. Click to create.`);

    this.containerEl.onclick = () => {
      vault.createNote(path).then((file) => openFile(app, file));
    };
  }
}

export function createRefRenderer(
  target: MaybeNoteRef,
  app: App,
  container: HTMLElement,
  settings: StructuredTreePluginSettings
) {
  if (!target.note || !target.note.file) {
    return new UnresolvedRefRenderChild(app, container, target, settings);
  } else {
    return new NoteRefRenderChild(app, container, target, settings);
  }
}
