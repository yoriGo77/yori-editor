import type { Editor, EditorPosition } from 'obsidian';

export interface TableCtx {
  startLine: number;
  endLine: number;
  lines: string[];
  rowIndex: number;
  colIndex: number;
}

export function isTableSepRow(line: string): boolean {
  const t = line.trim();
  return /^\|[\s\-:|]+\|$/.test(t) && t.includes('-');
}

export function isTableRow(line: string): boolean {
  const t = line.trim();
  return t.startsWith('|') && t.endsWith('|') && t.length > 2;
}

function splitCells(line: string): string[] {
  const t = line.trim();
  const inner = t.slice(1, -1);
  return inner.split('|').map((c) => c.trim());
}

export function columnCount(lines: string[]): number {
  for (const ln of lines) {
    if (isTableSepRow(ln)) continue;
    if (isTableRow(ln)) return splitCells(ln).length;
  }
  return 0;
}

function estimateColFromLine(line: string, ch: number): number {
  const cells = splitCells(line);
  if (cells.length === 0) return 0;
  const before = line.slice(0, ch);
  const pipes = (before.match(/\|/g) ?? []).length;
  return Math.max(0, Math.min(cells.length - 1, pipes - 1));
}

export function getTableAtCursor(editor: Editor): TableCtx | null {
  const cur = editor.getCursor();
  const all = editor.getValue().split('\n');
  const lineNum = cur.line;
  if (lineNum < 0 || lineNum >= all.length) return null;
  const line = all[lineNum];
  if (!isTableRow(line) && !isTableSepRow(line)) return null;

  let start = lineNum;
  while (start > 0 && (isTableRow(all[start - 1]) || isTableSepRow(all[start - 1]))) {
    start--;
  }
  let end = lineNum;
  while (end + 1 < all.length && (isTableRow(all[end + 1]) || isTableSepRow(all[end + 1]))) {
    end++;
  }

  const slice = all.slice(start, end + 1);
  const hasSep = slice.some(isTableSepRow);
  const dataRows = slice.filter((l) => isTableRow(l) && !isTableSepRow(l));
  if (!hasSep || dataRows.length < 1) return null;

  const rowIndex = lineNum - start;
  const colIndex = isTableSepRow(line) ? 0 : estimateColFromLine(line, cur.ch);

  return { startLine: start, endLine: end, lines: slice, rowIndex, colIndex };
}

function joinRow(cells: string[]): string {
  return '| ' + cells.join(' | ') + ' |';
}

function tableBounds(editor: Editor, ctx: TableCtx): { from: EditorPosition; to: EditorPosition } {
  const from = { line: ctx.startLine, ch: 0 };
  const lastLen = editor.getLine(ctx.endLine).length;
  const to = { line: ctx.endLine, ch: lastLen };
  return { from, to };
}

function replaceTableBlock(editor: Editor, ctx: TableCtx, newLines: string[]): void {
  const { from, to } = tableBounds(editor, ctx);
  editor.replaceRange(newLines.join('\n'), from, to);
}

export function insertTableRow(editor: Editor, where: 'above' | 'below'): void {
  const ctx = getTableAtCursor(editor);
  if (!ctx) return;
  const cols = columnCount(ctx.lines);
  if (cols === 0) return;
  const newLine = joinRow(Array.from({ length: cols }, () => ''));
  const slice = editor.getValue().split('\n').slice(ctx.startLine, ctx.endLine + 1);
  const absRow = ctx.rowIndex;
  let idx = where === 'above' ? absRow : absRow + 1;
  const curLine = slice[absRow];
  if (isTableSepRow(curLine) && where === 'below') {
    idx = 1;
    while (idx < slice.length && isTableSepRow(slice[idx])) idx++;
  }
  slice.splice(idx, 0, newLine);
  replaceTableBlock(editor, ctx, slice);
  editor.setCursor({
    line: ctx.startLine + idx,
    ch: Math.min(2, editor.getLine(ctx.startLine + idx)?.length ?? 2),
  });
}

export function deleteTableRow(editor: Editor): void {
  const ctx = getTableAtCursor(editor);
  if (!ctx) return;
  const slice = editor.getValue().split('\n').slice(ctx.startLine, ctx.endLine + 1);
  const absRow = ctx.rowIndex;
  const line = slice[absRow];
  if (isTableSepRow(line)) return;
  const bodyRows = slice.filter((l) => isTableRow(l) && !isTableSepRow(l));
  if (bodyRows.length <= 1) {
    deleteTable(editor);
    return;
  }
  slice.splice(absRow, 1);
  replaceTableBlock(editor, ctx, slice);
  const nl = Math.min(ctx.startLine + Math.min(absRow, slice.length - 1), editor.lineCount() - 1);
  editor.setCursor({ line: Math.max(0, nl), ch: 0 });
}

export function insertTableColumn(editor: Editor, where: 'left' | 'right'): void {
  const ctx = getTableAtCursor(editor);
  if (!ctx) return;
  const col = ctx.colIndex + (where === 'right' ? 1 : 0);
  const slice = editor.getValue().split('\n').slice(ctx.startLine, ctx.endLine + 1);
  for (let i = 0; i < slice.length; i++) {
    const ln = slice[i];
    if (!isTableRow(ln) && !isTableSepRow(ln)) continue;
    const cells = splitCells(ln);
    cells.splice(col, 0, isTableSepRow(ln) ? '---' : '');
    slice[i] = joinRow(cells);
  }
  replaceTableBlock(editor, ctx, slice);
}

export function deleteTableColumn(editor: Editor): void {
  const ctx = getTableAtCursor(editor);
  if (!ctx) return;
  const col = ctx.colIndex;
  const cols = columnCount(ctx.lines);
  if (cols <= 1) {
    deleteTable(editor);
    return;
  }
  const slice = editor.getValue().split('\n').slice(ctx.startLine, ctx.endLine + 1);
  for (let i = 0; i < slice.length; i++) {
    const ln = slice[i];
    if (!isTableRow(ln) && !isTableSepRow(ln)) continue;
    const cells = splitCells(ln);
    if (col >= 0 && col < cells.length) cells.splice(col, 1);
    slice[i] = joinRow(cells);
  }
  replaceTableBlock(editor, ctx, slice);
}

export function deleteTable(editor: Editor): void {
  const ctx = getTableAtCursor(editor);
  if (!ctx) return;
  const { from, to } = tableBounds(editor, ctx);
  editor.replaceRange('', from, to);
  const maxLn = editor.lineCount() - 1;
  editor.setCursor({ line: Math.min(Math.max(0, ctx.startLine), maxLn), ch: 0 });
}
