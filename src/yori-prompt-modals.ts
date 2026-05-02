import { App, Modal, Setting, TextComponent } from "obsidian";

export function openYoriConfirmModal(app: App, message: string): Promise<boolean> {
  return new Promise((resolve) => {
    class ConfirmModal extends Modal {
      constructor() {
        super(app);
      }

      onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl("p", { text: message });
        new Setting(contentEl)
          .addButton((b) =>
            b.setButtonText("取消").onClick(() => {
              resolve(false);
              this.close();
            })
          )
          .addButton((b) =>
            b.setButtonText("继续").setCta().onClick(() => {
              resolve(true);
              this.close();
            })
          );
      }
    }
    new ConfirmModal().open();
  });
}

export function openYoriImageUrlAltModal(app: App): Promise<{ url: string; alt: string } | null> {
  return new Promise((resolve) => {
    class ImgModal extends Modal {
      urlField!: TextComponent;
      altField!: TextComponent;

      constructor() {
        super(app);
      }

      onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl("p", {
          text: "请输入图片链接（HTTP/HTTPS 或 data URL）与说明（可选）。"
        });
        new Setting(contentEl).setName("链接").addText((t) => {
          this.urlField = t;
          t.setValue("https://");
        });
        new Setting(contentEl).setName("说明").addText((t) => {
          this.altField = t;
          t.setPlaceholder("可选");
        });
        new Setting(contentEl)
          .addButton((b) =>
            b.setButtonText("取消").onClick(() => {
              resolve(null);
              this.close();
            })
          )
          .addButton((b) =>
            b.setButtonText("插入").setCta().onClick(() => {
              const url = this.urlField.getValue().trim();
              if (!url) {
                resolve(null);
                this.close();
                return;
              }
              resolve({ url, alt: this.altField.getValue() });
              this.close();
            })
          );
      }
    }
    new ImgModal().open();
  });
}
