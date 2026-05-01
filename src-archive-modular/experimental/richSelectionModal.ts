import { App, Editor, MarkdownView, Modal, Notice } from 'obsidian';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * 纯文本按空行分段；块级用 div 而非 p，避免对齐/列表产生「p 包 div」无效嵌套，
 * Obsidian / 浏览器解析异常时会整段当纯文本显示。
 */
function plainTextToHtmlFragment(s: string): string {
  const paras = s.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  if (paras.length === 0) return '<div><br></div>';
  return paras
    .map((p) => `<div>${escapeHtml(p).replace(/\n/g, '<br>')}</div>`)
    .join('');
}

/** 去掉非法结构：含 div/ul/ol 等块级子节点的 p 会被拆开，避免渲染失败 */
function normalizeRichHtml(html: string): string {
  const wrap = document.createElement('div');
  wrap.innerHTML = html.trim();
  const ps = Array.from(wrap.querySelectorAll('p'));
  for (const p of ps) {
    const hasBlockChild = Array.from(p.children).some((c) =>
      /^(DIV|UL|OL|TABLE|H[1-6]|HR|BLOCKQUOTE|PRE)$/i.test(c.tagName),
    );
    if (!hasBlockChild) continue;
    const parent = p.parentNode;
    if (!parent) continue;
    const frag = document.createDocumentFragment();
    while (p.firstChild) frag.appendChild(p.firstChild);
    parent.insertBefore(frag, p);
    parent.removeChild(p);
  }
  return wrap.innerHTML;
}

function isEmptyRichHtml(html: string): boolean {
  const t = html.replace(/\s|\u00a0/g, '').toLowerCase();
  return (
    !t ||
    t === '<p><br></p>' ||
    t === '<p></p>' ||
    t === '<br>' ||
    t === '<div><br></div>' ||
    t === '<div></div>'
  );
}

function looksLikeHtmlFragment(s: string): boolean {
  const t = s.trim();
  return /^<[a-z!?]/i.test(t);
}

/** 保持选区在 surface 内时再执行 execCommand（工具栏按钮需 mousedown preventDefault） */
function execOnEditable(surface: HTMLElement, command: string, value?: string): void {
  surface.focus();
  try {
    document.execCommand(command, false, value ?? '');
  } catch {
    /* Electron/Chromium 下多数命令仍可用 */
  }
}

function bindToolbarBtn(
  btn: HTMLButtonElement,
  surface: HTMLElement,
  command: string,
  value?: string,
): void {
  btn.addEventListener('mousedown', (e) => e.preventDefault());
  btn.addEventListener('click', () => execOnEditable(surface, command, value));
}

export type RichSelectionModalOpts = {
  /** 替换整篇源码（慎用；适合 HTML 为主的内容） */
  fullDocument?: boolean;
};

export function openExperimentalRichFullNote(app: App): void {
  const view = app.workspace.getActiveViewOfType(MarkdownView);
  if (!view || view.getMode() !== 'source') {
    new Notice('请在 Markdown 笔记的「源码模式」下使用本命令');
    return;
  }
  const editor = view.editor;
  const body = editor.getValue();
  if (!body.trim()) {
    new Notice('笔记为空');
    return;
  }
  if (
    !confirm(
      '将以实验富文本编辑器替换【全文】。\n若正文以 Markdown 语法为主，可能造成结构丢失；请先备份。\n主要适合 HTML 片段较多的页面。\n\n确定继续？',
    )
  ) {
    return;
  }
  new RichSelectionModal(app, editor, body, { fullDocument: true }).open();
}

/**
 * 实验：仅编辑当前选区，写回为 HTML 片段（方案 A 小块往返原型）。
 * 不替换整篇编辑器；卸载插件后正文仍为 .md，片段可被自带预览解析（视 HTML 而定）。
 */
export function openExperimentalRichSelection(app: App): void {
  const view = app.workspace.getActiveViewOfType(MarkdownView);
  if (!view || view.getMode() !== 'source') {
    new Notice('请在 Markdown 笔记的「源码模式」下使用本命令');
    return;
  }
  const editor = view.editor;
  const sel = editor.getSelection();
  if (!sel.trim()) {
    new Notice('请先选中要编辑的片段（可多段），再运行命令');
    return;
  }
  new RichSelectionModal(app, editor, sel).open();
}

class RichSelectionModal extends Modal {
  constructor(
    app: App,
    private readonly editor: Editor,
    private readonly initialText: string,
    private readonly opts?: RichSelectionModalOpts,
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    this.titleEl.setText(
      this.opts?.fullDocument ? '富文本编辑（实验 · 全文）' : '富文本编辑（实验 · 选区）',
    );
    contentEl.createDiv({
      cls: 'yori-rich-selection-hint',
      text: this.opts?.fullDocument
        ? '全文实验：加载方式为 HTML 或纯文本分段。写回将替换整篇源码。纯 Markdown 长文请勿使用。仍可用工具栏与快捷键排版。'
        : '先选中弹窗内文字，再点按钮或使用 Ctrl+B / I / U。写回的是 HTML：在「源码模式」里会看到标签（正常）；切换阅读或 Live Preview 可看排版效果。对齐与列表已避免无效的「段落套 div」结构。',
    });

    const surface = contentEl.createDiv({
      cls: 'yori-rich-selection-surface',
      attr: { contenteditable: 'true', spellcheck: 'true', tabindex: '0' },
    });

    const toolbar = contentEl.createDiv({ cls: 'yori-rich-selection-toolbar' });
    surface.before(toolbar);

    const mkBtn = (label: string, title: string, cmd: string, val?: string) => {
      const b = toolbar.createEl('button', {
        type: 'button',
        cls: 'yori-rich-mini-btn',
        text: label,
      });
      b.title = title;
      bindToolbarBtn(b, surface, cmd, val);
    };

    mkBtn('B', '加粗', 'bold');
    mkBtn('I', '倾斜', 'italic');
    mkBtn('U', '下划线', 'underline');
    mkBtn('S', '删除线', 'strikeThrough');
    toolbar.createSpan({ cls: 'yori-rich-toolbar-gap' });
    mkBtn('左', '左对齐', 'justifyLeft');
    mkBtn('中', '居中', 'justifyCenter');
    mkBtn('右', '右对齐', 'justifyRight');
    toolbar.createSpan({ cls: 'yori-rich-toolbar-gap' });
    mkBtn('•', '无序列表', 'insertUnorderedList');
    mkBtn('1.', '有序列表', 'insertOrderedList');
    toolbar.createSpan({ cls: 'yori-rich-toolbar-gap' });
    mkBtn('清格式', '清除格式', 'removeFormat');

    const initialHtml = looksLikeHtmlFragment(this.initialText)
      ? this.initialText.trim()
      : plainTextToHtmlFragment(this.initialText);
    surface.innerHTML = normalizeRichHtml(initialHtml);

    const actions = contentEl.createDiv({ cls: 'yori-rich-selection-actions' });
    actions
      .createEl('button', { text: '取消', cls: 'mod-muted' })
      .addEventListener('click', () => this.close());
    actions
      .createEl('button', { text: '写回笔记', cls: 'mod-cta' })
      .addEventListener('click', () => {
        const html = normalizeRichHtml(surface.innerHTML);
        if (isEmptyRichHtml(html)) {
          new Notice('内容为空，未写回');
          return;
        }
        const chunk = html.trim();
        if (this.opts?.fullDocument) {
          const last = this.editor.lineCount() - 1;
          const end = { line: last, ch: this.editor.getLine(last).length };
          this.editor.replaceRange(chunk, { line: 0, ch: 0 }, end);
          new Notice('已替换全文（建议在预览中检查）');
        } else {
          this.editor.replaceSelection(`\n\n${chunk}\n\n`);
          new Notice('已写入选区（源码中可见标签时请用阅读/Live Preview 查看效果）');
        }
        this.close();
      });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
