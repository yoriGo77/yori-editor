import { sortRichTableCellsDocumentOrder } from "./rich-table-bulk-selection";
import {
  findRichTableCellTouchingSelectionRange,
  getRichTableCellFromSelection,
  selectionTouchesRichTableCell
} from "./rich-table-selection-dom";

export type RichTableBulkTextStyleContext = {
  richEditorEl: HTMLElement | null;
  tryGetCellsFromDragRectangle: () => HTMLTableCellElement[] | null;
  getCurrentRichTableCell: () => HTMLTableCellElement | null;
  getRichTableCellsForBulkStyle: (anchorCell: HTMLTableCellElement) => HTMLTableCellElement[];
};

/** 与单元格背景批量设置相同：拖选 / 矩形选区内的全部单元格，用于文字色与高亮 */
export function computeRichTableCellsForBulkTextStyle(ctx: RichTableBulkTextStyleContext): HTMLTableCellElement[] {
  const { richEditorEl } = ctx;
  if (!richEditorEl) return [];

  const sel = window.getSelection();
  let editorScopedRange = false;
  if (sel && sel.rangeCount > 0) {
    try {
      editorScopedRange = richEditorEl.contains(sel.getRangeAt(0).commonAncestorContainer);
    } catch {
      editorScopedRange = false;
    }
  }

  if (!editorScopedRange) {
    const fromDrag = ctx.tryGetCellsFromDragRectangle();
    if (fromDrag) return fromDrag;
    const visualOnly = Array.from(
      richEditorEl.querySelectorAll("td.yori-table-cell-selected, th.yori-table-cell-selected")
    );
    if (visualOnly.length > 1) return sortRichTableCellsDocumentOrder(visualOnly as HTMLTableCellElement[]);
    if (visualOnly.length === 1) return visualOnly as HTMLTableCellElement[];
    const fallbackCell = ctx.getCurrentRichTableCell();
    if (fallbackCell && richEditorEl.contains(fallbackCell)) {
      return sortRichTableCellsDocumentOrder(ctx.getRichTableCellsForBulkStyle(fallbackCell));
    }
    return [];
  }

  // 光标已在表格下方段落等位置时：不要用残留的 richDrag* 当作表格目标（否则会「跳回」表格内任务列表）
  if (!selectionTouchesRichTableCell(richEditorEl)) {
    return [];
  }

  const fromDrag = ctx.tryGetCellsFromDragRectangle();
  if (fromDrag) return fromDrag;

  const visual = Array.from(
    richEditorEl.querySelectorAll("td.yori-table-cell-selected, th.yori-table-cell-selected")
  );
  if (visual.length > 1) {
    return sortRichTableCellsDocumentOrder(visual as HTMLTableCellElement[]);
  }

  const cell =
    findRichTableCellTouchingSelectionRange(richEditorEl) ?? getRichTableCellFromSelection(richEditorEl);
  if (!cell || !richEditorEl.contains(cell)) {
    return visual.length === 1 ? (visual as HTMLTableCellElement[]) : [];
  }
  return sortRichTableCellsDocumentOrder(ctx.getRichTableCellsForBulkStyle(cell));
}
