import type { Editor } from 'obsidian';

/** 段落外边框（Markdown 中嵌入 HTML，Obsidian 预览通常可渲染） */

export type ParagraphBorderWidthId = 'hairline' | 'thin' | 'medium' | 'thick' | 'none';

const WIDTH_CSS: Record<Exclude<ParagraphBorderWidthId, 'none'>, string> = {
  hairline: '1px',
  thin: '2px',
  medium: '3px',
  thick: '5px',
};

const BORDER_WRAP_RE =
  /^<div class="yori-paragraph-border" style="([^"]*)">\s*\n\n([\s\S]*?)\n\n<\/div>\s*$/;

/** 选区刚好为整块边框 div 时探测当前粗细（用于菜单 √） */
export function probeParagraphBorderWidth(
  selection: string,
): ParagraphBorderWidthId | null {
  const m = selection.match(BORDER_WRAP_RE);
  if (!m) return null;
  const style = m[1];
  const bm = style.match(/border:\s*([\d.]+)px\s+solid/i);
  if (!bm) return 'thin';
  const px = parseFloat(bm[1]);
  if (Math.abs(px - 1) < 0.1) return 'hairline';
  if (Math.abs(px - 2) < 0.1) return 'thin';
  if (Math.abs(px - 3) < 0.1) return 'medium';
  if (Math.abs(px - 5) < 0.1) return 'thick';
  return 'thin';
}

export function applyParagraphBorder(
  editor: Editor,
  width: ParagraphBorderWidthId,
  color: string,
): void {
  let text = editor.getSelection();
  if (!text.trim()) return;
  const m = text.match(BORDER_WRAP_RE);
  if (m) text = m[2];
  if (width === 'none') {
    editor.replaceSelection(text);
    return;
  }
  const px = WIDTH_CSS[width];
  const style = `border:${px} solid ${color};padding:12px 14px;border-radius:8px;box-sizing:border-box`;
  editor.replaceSelection(
    `<div class="yori-paragraph-border" style="${style}">\n\n${text}\n\n</div>`,
  );
}

export const PARAGRAPH_BORDER_WIDTH_LABELS: {
  id: ParagraphBorderWidthId;
  label: string;
}[] = [
  { id: 'hairline', label: '极细（1px）' },
  { id: 'thin', label: '细（2px）' },
  { id: 'medium', label: '粗（3px）' },
  { id: 'thick', label: '极粗（5px）' },
];
