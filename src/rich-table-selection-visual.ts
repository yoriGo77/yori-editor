export function clearNativeSelectionInRichEditor(richEditorEl: HTMLElement | null): void {
  if (!richEditorEl) return;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const anchorNode = sel.anchorNode;
  const focusNode = sel.focusNode;
  const inEditor =
    (!!anchorNode && richEditorEl.contains(anchorNode)) ||
    (!!focusNode && richEditorEl.contains(focusNode));
  if (inEditor) {
    sel.removeAllRanges();
  }
}

export function clearRichTableSelectionVisual(richEditorRoot: HTMLElement | null): void {
  if (!richEditorRoot) return;
  richEditorRoot.querySelectorAll("th.yori-table-cell-selected, td.yori-table-cell-selected").forEach((el) => {
    el.classList.remove("yori-table-cell-selected");
  });
}

export type RichTableSelectionVisualContext = {
  richEditorRoot: HTMLElement | null;
  dragAnchorCell: HTMLTableCellElement | null;
  dragFocusCell: HTMLTableCellElement | null;
  pickSelectedForTable: (table: HTMLTableElement) => HTMLTableCellElement[];
};

export function refreshRichTableSelectionVisual(ctx: RichTableSelectionVisualContext): void {
  const { richEditorRoot } = ctx;
  if (!richEditorRoot) return;
  clearRichTableSelectionVisual(richEditorRoot);
  let selectedCells: HTMLTableCellElement[] = [];

  if (ctx.dragAnchorCell && ctx.dragFocusCell) {
    const table = ctx.dragAnchorCell.closest("table");
    if (table && table === ctx.dragFocusCell.closest("table")) {
      selectedCells = ctx.pickSelectedForTable(table);
    }
  }

  if (selectedCells.length <= 1) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
    const anchorEl =
      selection.anchorNode instanceof Element ? selection.anchorNode : selection.anchorNode?.parentElement;
    const focusEl =
      selection.focusNode instanceof Element ? selection.focusNode : selection.focusNode?.parentElement;
    const anchorTable = anchorEl?.closest("table");
    const focusTable = focusEl?.closest("table");
    if (!anchorTable || anchorTable !== focusTable) return;
    if (!richEditorRoot.contains(anchorTable)) return;
    selectedCells = ctx.pickSelectedForTable(anchorTable);
  }

  if (selectedCells.length <= 1) return;
  selectedCells.forEach((cell) => cell.classList.add("yori-table-cell-selected"));
}
