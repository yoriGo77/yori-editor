import type { App, Editor } from "obsidian";
import { FuzzySuggestModal, Notice, TFile } from "obsidian";

import { vaultLinkPickerStrings, type YoriUiLang } from "./yori-locale";

export interface VaultLinkPickerHost {
  app: App;
  richEditorEl: HTMLDivElement | null;
  resolveHydrationSourcePath(): string;
  markdownLinkForRichDroppedVaultFile(dest: TFile, sourcePath: string): string;
  insertRichPlainAtCaret(text: string): void;
  scheduleRichEditorHydratePasses(): void;
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
      const md = h.markdownLinkForRichDroppedVaultFile(item, sourcePath);
      if (mode === "rich") {
        h.richEditorEl?.focus({ preventScroll: true });
        h.insertRichPlainAtCaret(md);
        h.scheduleRichEditorHydratePasses();
      } else if (editor) {
        editor.replaceSelection(md);
      } else {
        new Notice(L.markdownNoEditor);
      }
    }
  }
  new VaultLinkPicker().open();
}
