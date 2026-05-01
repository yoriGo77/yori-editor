import { App, Modal, Setting } from "obsidian";

/** `<input type="color">` 仅接受 #rrggbb */
export function normalizeHexForColorInput(hex: string): string {
  const h = (hex || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(h)) return h.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(h)) {
    const r = h[1];
    const g = h[2];
    const b = h[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return "#cccccc";
}

/** Obsidian/Electron 下 `window.prompt` 往往不可用，用原生颜色盘 + Modal。 */
export type YoriColorPickModalCopy = {
  hint: string;
  pickerAria: string;
  apply: string;
  cancel: string;
};

export class YoriColorPickModal extends Modal {
  private chosen: string | null = null;

  constructor(
    app: App,
    private readonly modalTitle: string,
    private readonly initialHex: string,
    private readonly copy: YoriColorPickModalCopy,
    private readonly onFinish: (value: string | null) => void
  ) {
    super(app);
  }

  onOpen(): void {
    this.chosen = null;
    this.setTitle(this.modalTitle);
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createDiv({
      cls: "yori-color-modal-hint",
      text: this.copy.hint
    });

    const picker = contentEl.createEl("input", {
      type: "color",
      cls: "yori-color-modal-picker",
      attr: { "aria-label": this.copy.pickerAria }
    });
    picker.value = normalizeHexForColorInput(this.initialHex);

    new Setting(contentEl)
      .addButton((btn) =>
        btn
          .setButtonText(this.copy.apply)
          .setCta()
          .onClick(() => {
            this.chosen = picker.value;
            this.close();
          })
      )
      .addButton((btn) =>
        btn.setButtonText(this.copy.cancel).onClick(() => {
          this.chosen = null;
          this.close();
        })
      );
  }

  onClose(): void {
    this.contentEl.empty();
    this.onFinish(this.chosen);
  }
}
