import type { App, Editor } from "obsidian";
import { FuzzySuggestModal, Notice, TFile } from "obsidian";

import { vaultLinkPickerStrings, type YoriUiLang } from "./yori-locale";

export interface VaultLinkPickerHost {
  app: App;
  richEditorEl: HTMLDivElement | null;
  resolveHydrationSourcePath(): string;
  markdownLinkForRichDroppedVaultFile(dest: TFile, sourcePath: string): string;
  insertRichPlainAtCaret(text: string, opts?: { vaultWikiCaretAfter?: boolean }): void;
  scheduleRichEditorHydratePasses(): void;
  /** 弹窗会抢走焦点导致选区丢失；插入前恢复右键/命令打开选择器时记录的插入位置 */
  restoreRichVaultLinkInsertSnapshot?: () => void;
  clearRichVaultLinkInsertSnapshot?: () => void;
}

export function openVaultLinkPickerModal(
  host: VaultLinkPickerHost,
  mode: "rich" | "markdown",
  editor: Editor | null | undefined,
  lang: YoriUiLang
): void {
  const L = vaultLinkPickerStrings(lang);
  const sourcePath =
    mode === "rich"
      ? host.resolveHydrationSourcePath()
      : (host.app.workspace.getActiveFile()?.path ?? "");
  if (!sourcePath) {
    new Notice(L.openNoteFirst);
    return;
  }
  const h = host;
  class VaultLinkPicker extends FuzzySuggestModal<TFile> {
    private itemChosen = false;

    constructor() {
      super(h.app);
      this.setPlaceholder(L.placeholder);
    }

    getItems(): TFile[] {
      return h.app.vault.getFiles();
    }

    getItemText(item: TFile): string {
      return item.path;
    }

    onChooseItem(item: TFile): void {
      this.itemChosen = true;
      const md = h.markdownLinkForRichDroppedVaultFile(item, sourcePath);
      if (mode === "rich") {
        h.restoreRichVaultLinkInsertSnapshot?.();
        h.richEditorEl?.focus({ preventScroll: true });
        h.insertRichPlainAtCaret(md, { vaultWikiCaretAfter: true });
        h.clearRichVaultLinkInsertSnapshot?.();
        h.scheduleRichEditorHydratePasses();
      } else if (editor) {
        editor.replaceSelection(md);
      } else {
        new Notice(L.markdownNoEditor);
      }
    }

    onClose(): void {
      super.onClose();
      if (mode === "rich" && !this.itemChosen) {
        h.clearRichVaultLinkInsertSnapshot?.();
      }
    }
  }
  new VaultLinkPicker().open();
}
