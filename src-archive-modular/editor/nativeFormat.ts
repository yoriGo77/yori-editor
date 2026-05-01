import type { Editor } from 'obsidian';

function getSelection(editor: Editor): { from: number; to: number; text: string } {
  const sel = editor.getSelection();
  const from = editor.posToOffset(editor.getCursor('from'));
  const to = editor.posToOffset(editor.getCursor('to'));
  return { from, to, text: sel };
}

/** 用成对标记包裹选区；若选区已完全被一对标记包住则去除 */
export function toggleWrap(
  editor: Editor,
  open: string,
  close: string,
): void {
  const { from, to, text } = getSelection(editor);
  if (from === to && text.length === 0) return;

  const doc = editor.getValue();
  const before = doc.slice(Math.max(0, from - open.length), from);
  const after = doc.slice(to, to + close.length);
  if (before === open && after === close) {
    editor.replaceRange(text, editor.offsetToPos(from - open.length), editor.offsetToPos(to + close.length));
    return;
  }
  editor.replaceRange(open + text + close, editor.offsetToPos(from), editor.offsetToPos(to));
}

export function toggleBold(editor: Editor): void {
  toggleWrap(editor, '**', '**');
}

export function toggleItalic(editor: Editor): void {
  toggleWrap(editor, '*', '*');
}

export function toggleStrikethrough(editor: Editor): void {
  toggleWrap(editor, '~~', '~~');
}

export function toggleUnderlineHtml(editor: Editor): void {
  toggleWrap(editor, '<u>', '</u>');
}

export function toggleHighlight(editor: Editor): void {
  toggleWrap(editor, '==', '==');
}

export function wrapHtmlSpan(
  editor: Editor,
  attrs: Record<string, string>,
): void {
  const { from, to, text } = getSelection(editor);
  if (from === to && text.length === 0) return;
  const styleParts = Object.entries(attrs).map(([k, v]) => `${k}:${v}`);
  const open = `<span style="${styleParts.join(';')}">`;
  const close = '</span>';
  toggleWrap(editor, open, close);
}

/** 粗略清除：移除常见 Markdown/HTML 包裹（选区内多层需多次执行） */
export function clearFormattingApprox(editor: Editor): void {
  let text = editor.getSelection();
  if (!text) return;
  const patterns: RegExp[] = [
    /\*\*([^*]+)\*\*/g,
    /\*([^*]+)\*/g,
    /~~([^~]+)~~/g,
    /==([^=]+)==/g,
    /<u>([^<]*)<\/u>/gi,
    /<span[^>]*>([\s\S]*?)<\/span>/gi,
  ];
  for (const re of patterns) {
    text = text.replace(re, '$1');
  }
  editor.replaceSelection(text);
}

export type AlignKind = 'left' | 'center' | 'right';

const ALIGN_BLOCK_RE =
  /^<div style="text-align:(left|center|right)">\s*\n\n([\s\S]*?)\n\n<\/div>\s*$/;

const LH_BLOCK_RE =
  /^<div style="line-height:([\d.]+)">\s*\n\n([\s\S]*?)\n\n<\/div>\s*$/;

/** 左 → 中 → 右 → 左；已包裹对齐块时替换为下一档，避免无限嵌套 */
export function cycleBlockAlign(editor: Editor): void {
  let text = editor.getSelection();
  if (!text) return;
  let inner = text;
  let current: AlignKind | null = null;
  const am = text.match(ALIGN_BLOCK_RE);
  if (am) {
    current = am[1] as AlignKind;
    inner = am[2];
  }
  const order: AlignKind[] = ['left', 'center', 'right'];
  const base = current ?? 'left';
  const next = order[(order.indexOf(base) + 1) % order.length];
  editor.replaceSelection(
    `<div style="text-align:${next}">\n\n${inner}\n\n</div>`,
  );
}

export function applyLineHeightBlock(editor: Editor, lh: string): void {
  let text = editor.getSelection();
  if (!text) return;
  const m = text.match(LH_BLOCK_RE);
  if (m) text = m[2];
  editor.replaceSelection(
    `<div style="line-height:${lh}">\n\n${text}\n\n</div>`,
  );
}
