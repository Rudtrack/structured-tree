import { App, SuggestModal, setIcon, getIconIds, ButtonComponent} from "obsidian";

export const structuredActivityBarName = "structured-activity-bar";

// Function to wrap the SVG path in an SVG element
export function getStructuredActivityBarIcon(svgPath: string): string {
  return `<svg width="100px" height="100px" version="1.1" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="currentColor" stroke="currentColor">${svgPath}</svg>`;
}

// SVG path
const structuredActivityBarIconPath = `<path d="m62.094 52.941h-3.2695c-2.1445 0-4.1523-0.57422-5.8828-1.5742v26.574c0 3.25 2.6328 5.8828 5.8828 5.8828h3.2695c1.3359-5.8945 6.6094-10.293 12.906-10.293 7.3086 0 13.234 5.9219 13.234 13.234 0 7.3086-5.9258 13.234-13.234 13.234-6.2969 0-11.57-4.3984-12.906-10.293h-3.2695c-6.5 0-11.766-5.2695-11.766-11.766v-55.883c0-3.25-2.6328-5.8828-5.8828-5.8828h-3.2695c-1.3359 5.8945-6.6094 10.293-12.906 10.293-7.3086 0-13.234-5.9219-13.234-13.234 0-7.3086 5.9258-13.234 13.234-13.234 6.2969 0 11.57 4.3984 12.906 10.293h3.2695c6.5 0 11.766 5.2695 11.766 11.766v19.117c0 3.25 2.6328 5.8828 5.8828 5.8828h3.2695c1.3359-5.8945 6.6094-10.293 12.906-10.293 7.3086 0 13.234 5.9258 13.234 13.234s-5.9258 13.234-13.234 13.234c-6.2969 0-11.57-4.3984-12.906-10.293zm-37.094-32.352c4.0625 0 7.3516-3.293 7.3516-7.3555 0-4.0586-3.2891-7.3516-7.3516-7.3516s-7.3516 3.293-7.3516 7.3516c0 4.0625 3.2891 7.3555 7.3516 7.3555zm50 73.527c4.0625 0 7.3516-3.293 7.3516-7.3516 0-4.0625-3.2891-7.3555-7.3516-7.3555s-7.3516 3.293-7.3516 7.3555c0 4.0586 3.2891 7.3516 7.3516 7.3516zm0-36.766c4.0625 0 7.3516-3.2891 7.3516-7.3516s-3.2891-7.3516-7.3516-7.3516-7.3516 3.2891-7.3516 7.3516 3.2891 7.3516 7.3516 7.3516z"/>`;

// Using the function to get the complete SVG
export const structuredActivityBarIcon = getStructuredActivityBarIcon(
  structuredActivityBarIconPath
);

export  class IconSuggestModal extends SuggestModal<string> {
  private onSelectCallback: (iconId: string | null) => void;

  constructor (app: App, onSelect: (iconId: string | null) => void) {
    super(app);
    this.onSelectCallback = onSelect;
  }

  getSuggestions(query: string): string[] | Promise<string[]> {
    const allIcons = getIconIds();
    if(!query) return allIcons;
    return allIcons.filter((icon) =>
      icon.toLowerCase().includes(query.toLowerCase())
    )
  }

  renderSuggestion(value: string, el: HTMLElement): void {
    setIcon(el, value);
    el.style.width = 'fit-content';
    el.style.height = 'fit-content';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    this.resultContainerEl.style.display = 'flex';
    this.resultContainerEl.style.flexFlow = 'row wrap';
  }

  onChooseSuggestion(iconId: string, evt: MouseEvent | KeyboardEvent): void {
    this.onSelectCallback(iconId);
  }
}

export function attachIconModal(button: ButtonComponent, onSelect: (iconId: string|null) => void) {
  const modal = new IconSuggestModal(this.app, onSelect);
  const modalEl = modal.modalEl;
  const buttonRect = button.buttonEl.getBoundingClientRect();
  const width = 248;

  modalEl.style.width = `${248}px`;
  modalEl.style.height = '240px';
  modalEl.style.position = 'absolute';
  modalEl.style.top = `${buttonRect.bottom}px`;
  modalEl.style.left = `${buttonRect.right - width}px`;
  modalEl.style.transform = "none";
  modal.open();
}