import { buildRichTableGrid } from "./rich-table-grid";

export function getRichTableCellsForBulkStyleFromAnchor(
  anchorCell: HTMLTableCellElement,
  pickSelectedForTable: (table: HTMLTableElement) => HTMLTableCellElement[]
): HTMLTableCellElement[] {
  const table = anchorCell.closest("table") as HTMLTableElement | null;
  if (!table) return [anchorCell];
  const picked = pickSelectedForTable(table);
  if (picked.length > 0) return picked;
  return [anchorCell];
}

export function sortRichTableCellsDocumentOrder(cells: HTMLTableCellElement[]): HTMLTableCellElement[] {
  const list = [...cells];
  list.sort((a, b) => {
    const pos = a.compareDocumentPosition(b);
    if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    return 0;
  });
  return list;
}

/** 表格拖选 anchor/focus 对应的矩形区域（逻辑格，含 colspan 展开）。 */
export function getDraggedRichTableCellsFromAnchors(
  table: HTMLTableElement,
  anchorCell: HTMLTableCellElement | null,
  focusCell: HTMLTableCellElement | null,
  isTableDragging: boolean
): HTMLTableCellElement[] {
  if (!anchorCell || !focusCell) return [];
  if (!table.contains(anchorCell) || !table.contains(focusCell)) return [];
  if (anchorCell === focusCell && !isTableDragging) return [];
  const model = buildRichTableGrid(table);
  const a = model.origins.get(anchorCell);
  const b = model.origins.get(focusCell);
  if (!a || !b) return [];
  const minRow = Math.min(a.row, b.row);
  const maxRow = Math.max(a.row, b.row);
  const minCol = Math.min(a.col, b.col);
  const maxCol = Math.max(a.col, b.col);
  const picked = new Set<HTMLTableCellElement>();
  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      const cell = model.grid[r]?.[c];
      if (cell) picked.add(cell);
    }
  }
  return Array.from(picked);
}

export type RichTableBulkPickContext = {
  dragAnchorCell: HTMLTableCellElement | null;
  dragFocusCell: HTMLTableCellElement | null;
  isTableDragging: boolean;
  getCurrentTableCell: () => HTMLTableCellElement | null;
};

export function getSelectedRichTableCells(
  table: HTMLTableElement,
  ctx: RichTableBulkPickContext
): HTMLTableCellElement[] {
  const dragSelected = getDraggedRichTableCellsFromAnchors(
    table,
    ctx.dragAnchorCell,
    ctx.dragFocusCell,
    ctx.isTableDragging
  );
  if (dragSelected.length > 0) return dragSelected;

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return [];
  const model = buildRichTableGrid(table);

  if (selection.isCollapsed) {
    const current = ctx.getCurrentTableCell();
    return current && table.contains(current) ? [current] : [];
  }

  const anchorNode = selection.anchorNode;
  const focusNode = selection.focusNode;
  const anchorEl = anchorNode instanceof Element ? anchorNode : anchorNode?.parentElement;
  const focusEl = focusNode instanceof Element ? focusNode : focusNode?.parentElement;
  const anchorCell = anchorEl?.closest("td, th") as HTMLTableCellElement | null;
  const focusCell = focusEl?.closest("td, th") as HTMLTableCellElement | null;
  if (anchorCell && focusCell && table.contains(anchorCell) && table.contains(focusCell)) {
    const a = model.origins.get(anchorCell);
    const b = model.origins.get(focusCell);
    if (a && b) {
      const minRow = Math.min(a.row, b.row);
      const maxRow = Math.max(a.row, b.row);
      const minCol = Math.min(a.col, b.col);
      const maxCol = Math.max(a.col, b.col);
      const picked = new Set<HTMLTableCellElement>();
      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          const cell = model.grid[r]?.[c];
          if (cell) picked.add(cell);
        }
      }
      if (picked.size > 0) return Array.from(picked);
    }
  }

  const current = ctx.getCurrentTableCell();
  return current && table.contains(current) ? [current] : [];
}

/** 拖选矩形对应的单元格列表；无有效矩形时返回 null */
export function tryGetRichTableCellsFromDragRectangle(
  richEditorRoot: HTMLElement | null,
  dragAnchorCell: HTMLTableCellElement | null,
  dragFocusCell: HTMLTableCellElement | null,
  pickCellsForTable: (table: HTMLTableElement) => HTMLTableCellElement[]
): HTMLTableCellElement[] | null {
  if (!richEditorRoot || !dragAnchorCell || !dragFocusCell) return null;
  const table = dragAnchorCell.closest("table") as HTMLTableElement | null;
  if (
    !table ||
    table !== dragFocusCell.closest("table") ||
    !richEditorRoot.contains(table)
  ) {
    return null;
  }
  const picked = pickCellsForTable(table);
  if (picked.length >= 1) return sortRichTableCellsDocumentOrder(picked);
  return null;
}

export type RichCurrentTableCellContext = {
  richEditorRoot: HTMLElement | null;
  contextCell: HTMLTableCellElement | null;
  dragAnchorCell: HTMLTableCellElement | null;
  dragFocusCell: HTMLTableCellElement | null;
};

/** 右键上下文格、选区、拖选锚点等综合判定当前「表格目标格」。 */
export function getCurrentRichTableCellFromEditor(ctx: RichCurrentTableCellContext): HTMLTableCellElement | null {
  if (!ctx.richEditorRoot) return null;
  if (ctx.contextCell && ctx.richEditorRoot.contains(ctx.contextCell)) {
    return ctx.contextCell;
  }
  const selection = window.getSelection();
  const anchor = selection?.anchorNode;
  if (anchor) {
    const node = anchor instanceof Element ? anchor : anchor.parentElement;
    if (node) {
      const cell = node.closest("td, th");
      if (cell && ctx.richEditorRoot.contains(cell)) {
        return cell as HTMLTableCellElement;
      }
    }
  }
  if (ctx.dragAnchorCell && ctx.richEditorRoot.contains(ctx.dragAnchorCell)) {
    return ctx.dragAnchorCell;
  }
  if (ctx.dragFocusCell && ctx.richEditorRoot.contains(ctx.dragFocusCell)) {
    return ctx.dragFocusCell;
  }
  return null;
}
