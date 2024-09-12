import { App, Modal, Setting } from "obsidian";

export class ConfirmationModal extends Modal {
  private result: (value: boolean) => void;
  private message: string;
  private confirmText: string;
  private cancelText: string;

  constructor(
    app: App,
    title: string,
    message: string,
    confirmText: string,
    cancelText: string,
    onResult: (result: boolean) => void
  ) {
    super(app);
    this.titleEl.setText(title);
    this.message = message;
    this.confirmText = confirmText;
    this.cancelText = cancelText;
    this.result = onResult;
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.setText(this.message);

    new Setting(contentEl)
    .addButton((btn) =>
      btn
        .setButtonText(this.confirmText)
        .setCta()
        .onClick(() => {
          this.result(true);
          this.close();
        })
    )
    .addButton((btn) =>
      btn.setButtonText(this.cancelText).onClick(() => {
        this.result(false);
        this.close();
      })
    );
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
