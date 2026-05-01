import { App, getAllTags, Modal } from "obsidian";

import { richTagInsertStrings, type YoriUiLang } from "./yori-locale";

export type RichTagInsertHost = {
  restoreCaretForTagInsert(): void;
  insertRichPlainAtCaret(text: string): void;
  scheduleRichEditorHydratePasses(): void;
  clearTagInsertCaretSnapshot(): void;
};

const LIST_LIMIT = 50;

/** 从库内已索引笔记聚合标签名（不含前导 #）。 */
export function collectVaultTagNames(app: App): string[] {
  const set = new Set<string>();
  for (const f of app.vault.getMarkdownFiles()) {
    const c = app.metadataCache.getFileCache(f);
    if (!c) continue;
    const tags = getAllTags(c);
    if (!tags?.length) continue;
    for (const raw of tags) {
      const t = raw.startsWith("#") ? raw.slice(1) : raw;
      if (t) set.add(t);
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

function filterTags(all: string[], query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return all.slice(0, LIST_LIMIT);
  const starts = all.filter((t) => t.toLowerCase().startsWith(q));
  const inc = all.filter((t) => !t.toLowerCase().startsWith(q) && t.toLowerCase().includes(q));
  return [...starts, ...inc].slice(0, LIST_LIMIT);
}

/** 建议项展示：优先前缀匹配加粗，否则子串匹配加粗。 */
function renderTagSuggestionLabel(container: HTMLElement, tag: string, query: string): void {
  container.empty();
  const q = query.trim().toLowerCase();
  if (!q) {
    container.setText(tag);
    return;
  }
  const tl = tag.toLowerCase();
  if (tl.startsWith(q)) {
    container.createEl("strong", { text: tag.slice(0, q.length) });
    container.appendText(tag.slice(q.length));
    return;
  }
  const idx = tl.indexOf(q);
  if (idx >= 0) {
    container.appendText(tag.slice(0, idx));
    container.createEl("strong", { text: tag.slice(idx, idx + q.length) });
    container.appendText(tag.slice(idx + q.length));
    return;
  }
  container.setText(tag);
}

export class RichTagInsertModal extends Modal {
  private userConfirmedInsert = false;

  constructor(
    app: App,
    private readonly host: RichTagInsertHost,
    private readonly allTags: string[],
    private readonly lang: YoriUiLang
  ) {
    super(app);
  }

  private inputEl!: HTMLInputElement;
  private listEl!: HTMLElement;
  private filtered: string[] = [];
  private activeIdx = 0;

  onOpen(): void {
    const T = richTagInsertStrings(this.lang);
    this.titleEl.setText(T.title);
    this.modalEl.addClass("yori-rich-tag-insert-modal");
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createDiv({
      cls: "yori-rich-tag-insert-hint",
      text: T.hint
    });

    const row = contentEl.createDiv({ cls: "yori-rich-tag-insert-row" });
    row.createSpan({ cls: "yori-rich-tag-insert-hash", text: "#" });
    this.inputEl = row.createEl("input", {
      cls: "yori-rich-tag-insert-input",
      type: "text",
      attr: {
        spellcheck: "false",
        autocomplete: "off",
        placeholder: T.placeholder
      }
    });

    this.listEl = contentEl.createDiv({ cls: "yori-rich-tag-insert-list" });

    const refreshList = (): void => {
      const q = this.inputEl.value;
      this.filtered = filterTags(this.allTags, q);
      this.activeIdx = this.filtered.length > 0 ? 0 : -1;
      this.renderList();
    };

    this.inputEl.addEventListener("input", refreshList);
    this.inputEl.addEventListener("keydown", (evt) => this.onInputKeydown(evt, refreshList));

    refreshList();
    window.setTimeout(() => {
      this.inputEl.focus();
      this.inputEl.select();
    }, 10);

    this.setCloseCallback(() => {
      if (!this.userConfirmedInsert) {
        this.host.clearTagInsertCaretSnapshot();
      }
    });
  }

  private renderList(): void {
    const T = richTagInsertStrings(this.lang);
    this.listEl.empty();
    if (this.filtered.length === 0) {
      this.listEl.createDiv({
        cls: "yori-rich-tag-insert-empty",
        text: this.inputEl.value.trim() ? T.emptyNoMatch : T.emptyNoQuery
      });
      return;
    }
    const q = this.inputEl.value;
    this.filtered.forEach((tag, i) => {
      const row = this.listEl.createDiv({
        cls: "yori-rich-tag-insert-item",
        attr: { "data-yori-tag-item": String(i) }
      });
      if (i === this.activeIdx) row.addClass("is-active");
      renderTagSuggestionLabel(row, tag, q);
      row.addEventListener("mousedown", (evt) => evt.preventDefault());
      row.addEventListener("click", () => {
        this.activeIdx = i;
        this.confirmInsert(tag);
      });
    });
  }

  private moveActive(delta: number): void {
    if (this.filtered.length === 0) return;
    let next = this.activeIdx + delta;
    if (next < 0) next = this.filtered.length - 1;
    if (next >= this.filtered.length) next = 0;
    this.activeIdx = next;
    this.renderList();
    const row = this.listEl.querySelector(`[data-yori-tag-item="${this.activeIdx}"]`);
    row?.scrollIntoView({ block: "nearest" });
  }

  private onInputKeydown(evt: KeyboardEvent, refreshList: () => void): void {
    if (evt.key === "ArrowDown") {
      evt.preventDefault();
      if (this.filtered.length === 0) refreshList();
      this.moveActive(1);
      return;
    }
    if (evt.key === "ArrowUp") {
      evt.preventDefault();
      if (this.filtered.length === 0) refreshList();
      this.moveActive(-1);
      return;
    }
    if (evt.key === "Enter") {
      evt.preventDefault();
      const raw = this.inputEl.value.trim();
      if (this.activeIdx >= 0 && this.filtered[this.activeIdx]) {
        this.confirmInsert(this.filtered[this.activeIdx]);
      } else if (raw.length > 0) {
        this.confirmInsert(raw);
      }
      return;
    }
  }

  private confirmInsert(tagBody: string): void {
    const normalized = tagBody.replace(/^#+/, "").trim();
    if (!normalized) return;
    const insertText = `#${normalized} `;
    this.userConfirmedInsert = true;
    this.close();
    window.requestAnimationFrame(() => {
      this.host.restoreCaretForTagInsert();
      this.host.insertRichPlainAtCaret(insertText);
      this.host.scheduleRichEditorHydratePasses();
      this.host.clearTagInsertCaretSnapshot();
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export function openRichTagInsertModal(app: App, host: RichTagInsertHost, lang: YoriUiLang): void {
  const tags = collectVaultTagNames(app);
  const modal = new RichTagInsertModal(app, host, tags, lang);
  modal.open();
}
