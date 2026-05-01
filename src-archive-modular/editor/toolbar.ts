import { App, Editor, MarkdownView, Menu, Notice, WorkspaceLeaf } from 'obsidian';
import type YoriEditorPlugin from '../main';
import {
  toggleBold,
  toggleHighlight,
  toggleItalic,
  toggleStrikethrough,
  toggleUnderlineHtml,
  wrapHtmlSpan,
  cycleBlockAlign,
  applyLineHeightBlock,
} from './nativeFormat';
import {
  insertHorizontalRule,
  toggleBullet,
  toggleNumbered,
  toggleTodo,
} from './nativeLists';
import { createPaletteGrid } from '../ui/colorGrid';
import { probeStyles, normalizeFontFamily } from './styleProbe';
import {
  applyParagraphBorder,
  PARAGRAPH_BORDER_WIDTH_LABELS,
  probeParagraphBorderWidth,
} from './paragraphBorder';
import { insertHtmlTable2x3, insertMarkdownPipeTable } from './htmlTable';

const FONT_OPTIONS: { label: string; value: string }[] = [
  { label: '默认', value: 'inherit' },
  { label: '宋体', value: 'SimSun, serif' },
  { label: '黑体', value: 'SimHei, sans-serif' },
  { label: '微软雅黑', value: '"Microsoft YaHei", sans-serif' },
  { label: '楷体', value: 'KaiTi, serif' },
  { label: '思源宋体', value: '"Source Han Serif SC", serif' },
  { label: '等宽', value: 'ui-monospace, monospace' },
];

const SIZE_OPTIONS: { label: string; value: string }[] = [
  { label: '12px', value: '12px' },
  { label: '13px', value: '13px' },
  { label: '14px', value: '14px' },
  { label: '正文', value: '16px' },
  { label: '18px', value: '18px' },
  { label: '20px', value: '20px' },
];

const LINE_OPTIONS: { label: string; value: string }[] = [
  { label: '1.4', value: '1.4' },
  { label: '1.6', value: '1.6' },
  { label: '1.8', value: '1.8' },
  { label: '2.0', value: '2' },
];

function fontValueFromProbe(probed: string | null): string {
  if (!probed || probed.trim() === '') return '__none__';
  const n = normalizeFontFamily(probed);
  for (const o of FONT_OPTIONS) {
    if (normalizeFontFamily(o.value) === n) return o.value;
  }
  return '__custom__';
}

function sizeValueFromProbe(probed: string | null): string {
  if (!probed || probed.trim() === '') return '__none__';
  const t = probed.trim().toLowerCase();
  for (const o of SIZE_OPTIONS) {
    if (o.value.toLowerCase() === t) return o.value;
  }
  return '__custom__';
}

function lineValueFromProbe(probed: string | null): string {
  if (!probed || probed.trim() === '') return '__none__';
  const n = parseFloat(probed);
  if (!Number.isFinite(n)) return '__custom__';
  for (const o of LINE_OPTIONS) {
    const on = parseFloat(o.value);
    if (Number.isFinite(on) && Math.abs(on - n) < 0.001) return o.value;
  }
  return '__custom__';
}

function el<K extends keyof HTMLElementTagNameMap>(
  parent: HTMLElement,
  tag: K,
  cls?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = parent.createEl(tag);
  if (cls) node.className = cls;
  if (text) node.setText(text);
  return node;
}

function toggleBtnActive(btn: HTMLButtonElement, active: boolean): void {
  btn.toggleClass('yori-tb-btn--active', active);
}

export class YoriToolbar {
  constructor(
    private app: App,
    private plugin: YoriEditorPlugin,
    private leaf: WorkspaceLeaf,
    private container: HTMLElement,
  ) {}

  mount(): void {
    this.container.empty();
    this.container.addClass('yori-toolbar');
    this.container.createDiv({
      cls: 'yori-toolbar-divider',
      attr: { role: 'presentation' },
    });

    const row1 = el(this.container, 'div', 'yori-toolbar-row');
    this.buildFontControls(row1);
    this.buildInlineFormats(row1);

    const row2 = el(this.container, 'div', 'yori-toolbar-row');
    this.buildParagraphControls(row2);
    this.buildInsertControls(row2);

    this.refreshStates();
  }

  destroy(): void {
    this.container.empty();
    this.container.detach();
  }

  getEditor(): Editor | null {
    const v = this.leaf.view;
    if (v instanceof MarkdownView && v.editor) return v.editor;
    return null;
  }

  refreshStates(): void {
    const ed = this.getEditor();
    if (!ed) return;
    const text = ed.getSelection();
    toggleBtnActive(this.boldBtn, /\*\*[^*]+\*\*/.test(text));
    toggleBtnActive(this.italicBtn, /(^|[^*])\*[^*\n]+\*([^*]|$)/m.test(text));
    toggleBtnActive(this.strikeBtn, /~~[^~]+~~/.test(text));
    toggleBtnActive(this.underBtn, /<u>[\s\S]*?<\/u>/i.test(text));

    const probe = probeStyles(ed);
    const align = probe.textAlign ?? 'left';
    this.alignBtn.setText(this.alignLabel(align));

    const fv = fontValueFromProbe(probe.fontFamily);
    const fl =
      fv === '__custom__'
        ? '自定义'
        : fv === '__none__'
          ? '默认'
          : FONT_OPTIONS.find((o) => o.value === fv)?.label ?? '默认';
    this.fontMenuBtn.setText(`字体 · ${fl} ▾`);

    const sv = sizeValueFromProbe(probe.fontSize);
    const sl =
      sv === '__custom__'
        ? '自定义'
        : sv === '__none__'
          ? '默认'
          : SIZE_OPTIONS.find((o) => o.value === sv)?.label ?? '正文';
    this.sizeMenuBtn.setText(`字号 · ${sl} ▾`);

    const lv = lineValueFromProbe(probe.lineHeight);
    const ll =
      lv === '__custom__'
        ? '自定义'
        : lv === '__none__'
          ? '默认'
          : LINE_OPTIONS.find((o) => o.value === lv)?.label ?? '默认';
    this.lineMenuBtn.setText(`行间距 · ${ll} ▾`);
  }

  private boldBtn!: HTMLButtonElement;
  private italicBtn!: HTMLButtonElement;
  private strikeBtn!: HTMLButtonElement;
  private underBtn!: HTMLButtonElement;
  private alignBtn!: HTMLButtonElement;
  private fontMenuBtn!: HTMLButtonElement;
  private sizeMenuBtn!: HTMLButtonElement;
  private lineMenuBtn!: HTMLButtonElement;

  private alignLabel(a: 'left' | 'center' | 'right'): string {
    if (a === 'left') return '左对齐';
    if (a === 'center') return '居中';
    return '右对齐';
  }

  private buildFontControls(row: HTMLElement): void {
    const fontWrap = el(row, 'div', 'yori-toolbar-group');

    this.fontMenuBtn = fontWrap.createEl('button', {
      cls: 'yori-toolbar-selectlike',
      type: 'button',
      text: '字体 ▾',
    });
    this.fontMenuBtn.addEventListener('click', (evt) => {
      evt.preventDefault();
      const ed = this.getEditor();
      const menu = new Menu();
      const probe = ed ? probeStyles(ed) : null;
      const cur = fontValueFromProbe(probe?.fontFamily ?? null);
      for (const f of FONT_OPTIONS) {
        menu.addItem((item) =>
          item
            .setTitle(f.label)
            .setChecked(
              (cur === '__none__' && f.value === 'inherit') ||
                (cur !== '__none__' && cur !== '__custom__' && cur === f.value),
            )
            .onClick(() => {
              if (!ed || !ed.getSelection()) {
                new Notice('请先选中需要设置字体的文本');
                return;
              }
              wrapHtmlSpan(ed, { 'font-family': f.value });
              this.plugin.settings.defaultFontFamily = f.value;
              void this.plugin.saveSettings();
              this.refreshStates();
            }),
        );
      }
      menu.showAtMouseEvent(evt);
    });

    this.sizeMenuBtn = fontWrap.createEl('button', {
      cls: 'yori-toolbar-selectlike',
      type: 'button',
      text: '字号 ▾',
    });
    this.sizeMenuBtn.addEventListener('click', (evt) => {
      evt.preventDefault();
      const ed = this.getEditor();
      const menu = new Menu();
      const probe = ed ? probeStyles(ed) : null;
      const cur = sizeValueFromProbe(probe?.fontSize ?? null);
      for (const s of SIZE_OPTIONS) {
        menu.addItem((item) =>
          item
            .setTitle(s.label)
            .setChecked(cur !== '__none__' && cur !== '__custom__' && cur === s.value)
            .onClick(() => {
              if (!ed || !ed.getSelection()) {
                new Notice('请先选中需要设置字号的文本');
                return;
              }
              wrapHtmlSpan(ed, { 'font-size': s.value });
              this.plugin.settings.defaultFontSizeLabel = s.label;
              void this.plugin.saveSettings();
              this.refreshStates();
            }),
        );
      }
      menu.showAtMouseEvent(evt);
    });
  }

  private buildInlineFormats(row: HTMLElement): void {
    const g = el(row, 'div', 'yori-toolbar-group');
    this.boldBtn = this.iconToggle(g, 'B', '加粗', () => {
      toggleBold(this.getEditor()!);
      this.refreshStates();
    });
    this.italicBtn = this.iconToggle(g, 'I', '倾斜', () => {
      toggleItalic(this.getEditor()!);
      this.refreshStates();
    });
    this.strikeBtn = this.iconToggle(g, 'S', '删除线', () => {
      toggleStrikethrough(this.getEditor()!);
      this.refreshStates();
    });
    this.underBtn = this.iconToggle(g, 'U', '下划线', () => {
      toggleUnderlineHtml(this.getEditor()!);
      this.refreshStates();
    });
    this.iconToggle(g, 'H', '高亮', () => {
      toggleHighlight(this.getEditor()!);
      this.refreshStates();
    });
    this.colorBtn(g, '字色', (hex) => {
      wrapHtmlSpan(this.getEditor()!, { color: hex });
    });
    this.colorBtn(g, '底色', (hex) => {
      wrapHtmlSpan(this.getEditor()!, { 'background-color': hex });
    });
  }

  private iconToggle(
    parent: HTMLElement,
    label: string,
    title: string,
    onClick: () => void,
  ): HTMLButtonElement {
    const btn = parent.createEl('button', {
      cls: 'yori-tb-btn',
      type: 'button',
      text: label,
    });
    btn.title = title;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const ed = this.getEditor();
      if (!ed) return;
      if (!ed.getSelection()) {
        new Notice('请先选中要格式的文本');
        return;
      }
      onClick();
    });
    return btn;
  }

  private colorBtn(
    parent: HTMLElement,
    label: string,
    apply: (hex: string) => void,
  ): void {
    const btn = parent.createEl('button', {
      cls: 'yori-tb-btn yori-tb-btn--ghost',
      type: 'button',
      text: label,
    });
    btn.addEventListener('click', (evt) => {
      evt.preventDefault();
      const ed = this.getEditor();
      if (!ed || !ed.getSelection()) {
        new Notice('请先选中需要着色的文本');
        return;
      }
      showPalettePopover(btn, (hex) => {
        apply(hex);
      });
    });
  }

  private buildParagraphControls(row: HTMLElement): void {
    const g = el(row, 'div', 'yori-toolbar-group');
    this.alignBtn = g.createEl('button', {
      cls: 'yori-tb-btn',
      type: 'button',
      text: this.alignLabel('left'),
    });
    this.alignBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const ed = this.getEditor();
      if (!ed || !ed.getSelection()) {
        new Notice('请先选中需要对齐的段落');
        return;
      }
      cycleBlockAlign(ed);
      this.refreshStates();
    });

    this.lineMenuBtn = g.createEl('button', {
      cls: 'yori-toolbar-selectlike',
      type: 'button',
      text: '行间距 ▾',
    });
    this.lineMenuBtn.addEventListener('click', (evt) => {
      evt.preventDefault();
      const ed = this.getEditor();
      const menu = new Menu();
      const probe = ed ? probeStyles(ed) : null;
      const cur = lineValueFromProbe(probe?.lineHeight ?? null);
      for (const opt of LINE_OPTIONS) {
        menu.addItem((item) =>
          item
            .setTitle(`${opt.label} 倍`)
            .setChecked(cur !== '__none__' && cur !== '__custom__' && cur === opt.value)
            .onClick(() => {
              if (!ed || !ed.getSelection()) {
                new Notice('请先选中需要调整行距的段落');
                return;
              }
              applyLineHeightBlock(ed, opt.value);
              this.refreshStates();
            }),
        );
      }
      menu.showAtMouseEvent(evt);
    });

    const listBtn = (text: string, fn: (ed: Editor) => void) => {
      const b = g.createEl('button', {
        cls: 'yori-tb-btn yori-tb-btn--ghost',
        type: 'button',
        text,
      });
      b.addEventListener('click', (e) => {
        e.preventDefault();
        const ed = this.getEditor();
        if (!ed) return;
        fn(ed);
      });
    };
    listBtn('• 列表', toggleBullet);
    listBtn('1. 编号', toggleNumbered);
    listBtn('☐ 待办', toggleTodo);
  }

  private buildInsertControls(row: HTMLElement): void {
    const g = el(row, 'div', 'yori-toolbar-group');

    const mk = (text: string, title: string, onClick: () => void, disabled?: boolean) => {
      const b = g.createEl('button', {
        cls: 'yori-tb-btn yori-tb-btn--ghost',
        type: 'button',
        text,
      });
      b.title = title;
      if (disabled) {
        b.disabled = true;
        b.addClass('yori-tb-btn--disabled');
      }
      b.addEventListener('click', (e) => {
        e.preventDefault();
        if (disabled) {
          new Notice('该操作当前不可用');
          return;
        }
        onClick();
      });
    };

    const tableBtn = g.createEl('button', {
      cls: 'yori-tb-btn yori-tb-btn--ghost',
      type: 'button',
      text: '表格 ▾',
    });
    tableBtn.addEventListener('click', (evt) => {
      evt.preventDefault();
      const ed = this.getEditor();
      if (!ed) return;
      const menu = new Menu();
      menu.addItem((item) =>
        item.setTitle('Markdown 表格（pipe · 2×3）').onClick(() => insertMarkdownPipeTable(ed)),
      );
      menu.addItem((item) =>
        item.setTitle('HTML 表格（2×3 · 样式）').onClick(() => insertHtmlTable2x3(ed)),
      );
      menu.showAtMouseEvent(evt);
    });

    const borderBtn = g.createEl('button', {
      cls: 'yori-tb-btn yori-tb-btn--ghost',
      type: 'button',
      text: '边框 ▾',
    });
    borderBtn.addEventListener('click', (evt) => {
      evt.preventDefault();
      const ed = this.getEditor();
      if (!ed || !ed.getSelection().trim()) {
        new Notice('请先选中要加边框的内容');
        return;
      }
      const probe = probeParagraphBorderWidth(ed.getSelection());
      const menu = new Menu();
      menu.addItem((item) =>
        item.setTitle('边框颜色…').onClick(() => {
          showPalettePopover(borderBtn, (hex) => {
            this.plugin.settings.lastParagraphBorderColor = hex;
            void this.plugin.saveSettings();
            new Notice(`边框颜色已设为 ${hex}，请再选粗细`);
          });
        }),
      );
      menu.addSeparator();
      for (const w of PARAGRAPH_BORDER_WIDTH_LABELS) {
        menu.addItem((item) =>
          item
            .setTitle(w.label)
            .setChecked(probe === w.id)
            .onClick(() => {
              applyParagraphBorder(ed, w.id, this.plugin.settings.lastParagraphBorderColor);
              this.refreshStates();
            }),
        );
      }
      menu.addSeparator();
      menu.addItem((item) =>
        item.setTitle('取消边框').onClick(() => {
          applyParagraphBorder(ed, 'none', '');
          this.refreshStates();
        }),
      );
      menu.showAtMouseEvent(evt);
    });

    mk('分隔线', '插入 ---', () => {
      const ed = this.getEditor();
      if (ed) insertHorizontalRule(ed);
    });

    mk('链接', '使用 Obsidian 命令插入链接', () => {
      const cmds = (
        this.app as unknown as {
          commands: { executeCommandById: (id: string) => boolean };
        }
      ).commands;
      const ok = cmds.executeCommandById('editor:add-link');
      if (!ok) new Notice('未找到插入链接命令，请使用 Ctrl/Cmd+K 或命令面板');
    });

    mk('附件', '由 Obsidian 侧栏添加附件', () => {
      new Notice('请将附件拖入笔记，或使用文件列表 / 命令面板添加。');
    });
  }
}

function showPalettePopover(anchor: HTMLElement, onPick: (hex: string) => void): void {
  activeDocument.body.querySelector('.yori-palette-pop')?.remove();

  const pop = activeDocument.body.createDiv({ cls: 'yori-palette-pop' });
  const rect = anchor.getBoundingClientRect();
  pop.style.position = 'fixed';
  pop.style.left = `${rect.left}px`;
  pop.style.top = `${rect.bottom + 4}px`;
  pop.style.zIndex = 'var(--layer-popover)';

  createPaletteGrid(pop, (hex) => {
    onPick(hex);
    pop.remove();
  });

  const close = (ev: MouseEvent) => {
    if (!pop.contains(ev.target as Node)) {
      pop.remove();
      activeDocument.removeEventListener('mousedown', close, true);
    }
  };
  activeWindow.setTimeout(() => {
    activeDocument.addEventListener('mousedown', close, true);
  }, 0);
}

export function mountToolbarForLeaf(plugin: YoriEditorPlugin, leaf: WorkspaceLeaf): void {
  const view = leaf.view;
  if (!(view instanceof MarkdownView)) return;
  const host = view.containerEl.querySelector('.markdown-source-view');
  if (!host || !(host instanceof HTMLElement)) return;

  if (host.querySelector(':scope > .yori-toolbar-host')) return;

  const toolbarHost = host.createDiv({ cls: 'yori-toolbar-host' });
  host.insertBefore(toolbarHost, host.firstChild);

  const tb = new YoriToolbar(plugin.app, plugin, leaf, toolbarHost);
  tb.mount();
  plugin.toolbars.set(leaf, tb);

  plugin.registerDomEvent(view.containerEl, 'mouseup', () => {
    tb.refreshStates();
  });
  plugin.registerDomEvent(view.containerEl, 'keyup', () => {
    tb.refreshStates();
  });
}

export function unmountToolbarForLeaf(plugin: YoriEditorPlugin, leaf: WorkspaceLeaf): void {
  const tb = plugin.toolbars.get(leaf);
  if (tb) {
    tb.destroy();
    plugin.toolbars.delete(leaf);
    return;
  }
  const mv = leaf.view;
  if (mv instanceof MarkdownView) {
    mv.containerEl
      .querySelector('.markdown-source-view > .yori-toolbar-host')
      ?.remove();
  }
}
