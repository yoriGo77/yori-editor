/** 高级编辑区内：表格单元格与 document selection 相关的 DOM 辅助（不含插件状态）。 */

export function getRichTableCellFromSelection(richEditorRoot: HTMLElement | null): HTMLTableCellElement | null {
  if (!richEditorRoot) return null;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  let node: Node | null = sel.anchorNode;
  if (!node || !richEditorRoot.contains(node)) return null;
  let depth = 0;
  while (node && depth++ < 30) {
    if (node instanceof HTMLTableCellElement && node.matches("td, th")) return node;
    node = node.parentNode;
  }
  return null;
}

/** 当前选区是否与任一表格单元格相交（含跨格选区） */
export function selectionTouchesRichTableCell(richEditorRoot: HTMLElement | null): boolean {
  if (!richEditorRoot) return false;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  try {
    const r = sel.getRangeAt(0);
    if (!richEditorRoot.contains(r.commonAncestorContainer)) return false;
    for (const seed of [r.startContainer, r.endContainer, r.commonAncestorContainer]) {
      let n: Node | null = seed;
      let depth = 0;
      while (n && depth++ < 48 && n !== richEditorRoot) {
        if (n instanceof Element && (n.tagName === "TD" || n.tagName === "TH")) return true;
        n = n.parentNode;
      }
    }
  } catch {
    return false;
  }
  return false;
}

/** 从当前选区解析到的某一相交单元格（用于批量样式；避免误用拖选残留引用） */
export function findRichTableCellTouchingSelectionRange(
  richEditorRoot: HTMLElement | null
): HTMLTableCellElement | null {
  if (!richEditorRoot) return null;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  try {
    const r = sel.getRangeAt(0);
    for (const seed of [r.startContainer, r.endContainer, r.commonAncestorContainer]) {
      let n: Node | null = seed;
      let depth = 0;
      while (n && depth++ < 48 && n !== richEditorRoot) {
        if (n instanceof Element && (n.tagName === "TD" || n.tagName === "TH")) {
          const c = n as HTMLTableCellElement;
          return richEditorRoot.contains(c) ? c : null;
        }
        n = n.parentNode;
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function getAdjacentRichTableCell(
  cell: HTMLTableCellElement,
  dir: "next" | "prev"
): HTMLTableCellElement | null {
  const row = cell.parentElement as HTMLTableRowElement | null;
  const table = cell.closest("table") as HTMLTableElement | null;
  if (!row || !table) return null;
  const idx = cell.cellIndex;
  if (dir === "next") {
    if (idx + 1 < row.cells.length) return row.cells[idx + 1] as HTMLTableCellElement;
    let r = row.nextElementSibling as HTMLTableRowElement | null;
    while (r && r.cells.length === 0) r = r.nextElementSibling as HTMLTableRowElement | null;
    return (r?.cells[0] as HTMLTableCellElement) ?? null;
  }
  if (idx > 0) return row.cells[idx - 1] as HTMLTableCellElement;
  let r = row.previousElementSibling as HTMLTableRowElement | null;
  while (r && r.cells.length === 0) r = r.previousElementSibling as HTMLTableRowElement | null;
  if (!r) return null;
  return r.cells[r.cells.length - 1] as HTMLTableCellElement;
}

export function focusRichTableCell(
  richEditorRoot: HTMLElement | null,
  cell: HTMLTableCellElement,
  position: "start" | "end"
): void {
  if (!richEditorRoot?.contains(cell)) return;
  richEditorRoot.focus();
  if (cell.childNodes.length === 0) {
    cell.appendChild(document.createElement("br"));
  }
  const range = document.createRange();
  range.selectNodeContents(cell);
  range.collapse(position === "start");
  const sel = window.getSelection();
  if (!sel) return;
  sel.removeAllRanges();
  sel.addRange(range);
}

export function isRichSelectionInsideTableCell(cell: HTMLTableCellElement): boolean {
  const sel = window.getSelection();
  if (!sel?.rangeCount) return false;
  try {
    return cell.contains(sel.getRangeAt(0).commonAncestorContainer);
  } catch {
    return false;
  }
}

/** 表格内任务列表操作后：光标落在当前格任务复选框之后，避免与 restoreCaretToEndOfFirstTableCell 抢位置导致左右跳 */
export function restoreCaretAfterRichTaskListInTableCells(
  richEditorRoot: HTMLElement | null,
  cells: readonly HTMLTableCellElement[]
): void {
  if (cells.length === 0 || !richEditorRoot) return;
  const targetCell = cells.length === 1 ? cells[0] : cells[cells.length - 1];
  if (!targetCell || !richEditorRoot.contains(targetCell)) return;
  richEditorRoot.focus();
  const sel = window.getSelection();
  if (!sel) return;
  try {
    const cb = targetCell.querySelector(
      ":scope ul.contains-task-list > li.task-list-item > input.task-list-item-checkbox, :scope ul.contains-task-list > li.task-list-item > input[type='checkbox']"
    ) as HTMLInputElement | null;
    if (cb && cb.type === "checkbox") {
      const range = document.createRange();
      range.setStartAfter(cb);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      return;
    }
  } catch {
    /* fall through */
  }
  focusRichTableCell(richEditorRoot, targetCell, "end");
}
