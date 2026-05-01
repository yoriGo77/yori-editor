/** contenteditable 表格含 rowspan/colspan 时的逻辑格模型 */
export type RichTableGridModel = {
  grid: (HTMLTableCellElement | null)[][];
  origins: Map<HTMLTableCellElement, { row: number; col: number }>;
};

export function buildRichTableGrid(table: HTMLTableElement): RichTableGridModel {
  const grid: (HTMLTableCellElement | null)[][] = [];
  const origins = new Map<HTMLTableCellElement, { row: number; col: number }>();

  Array.from(table.rows).forEach((row, rowIndex) => {
    if (!grid[rowIndex]) grid[rowIndex] = [];
    let colIndex = 0;
    Array.from(row.cells).forEach((cell) => {
      while (grid[rowIndex][colIndex]) colIndex++;
      const rowSpan = Math.max(1, cell.rowSpan);
      const colSpan = Math.max(1, cell.colSpan);
      origins.set(cell, { row: rowIndex, col: colIndex });
      for (let r = 0; r < rowSpan; r++) {
        const targetRow = rowIndex + r;
        if (!grid[targetRow]) grid[targetRow] = [];
        for (let c = 0; c < colSpan; c++) {
          grid[targetRow][colIndex + c] = cell;
        }
      }
      colIndex += colSpan;
    });
  });

  return { grid, origins };
}

export function getOriginCellByGridPosition(
  table: HTMLTableElement,
  row: number,
  col: number
): HTMLTableCellElement | null {
  const model = buildRichTableGrid(table);
  const candidate = model.grid[row]?.[col] ?? null;
  if (!candidate) return null;
  const origin = model.origins.get(candidate);
  if (!origin || origin.row !== row || origin.col !== col) return null;
  return candidate;
}

export function findOriginCellAtOrAfter(
  model: RichTableGridModel,
  row: number,
  col: number
): HTMLTableCellElement | null {
  const rowData = model.grid[row];
  if (!rowData) return null;
  for (let i = col; i < rowData.length; i++) {
    const cell = rowData[i];
    if (!cell) continue;
    const origin = model.origins.get(cell);
    if (origin && origin.row === row && origin.col >= col) {
      return cell;
    }
  }
  return null;
}

/** 按表格阅读顺序（先行后列）排序单元格 */
export function orderRichTableCellsReadingOrder(
  table: HTMLTableElement,
  cells: HTMLTableCellElement[]
): HTMLTableCellElement[] {
  const model = buildRichTableGrid(table);
  const scored = cells.map((c) => {
    const o = model.origins.get(c);
    return { c, row: o?.row ?? 0, col: o?.col ?? 0 };
  });
  scored.sort((a, b) => (a.row !== b.row ? a.row - b.row : a.col - b.col));
  return scored.map((x) => x.c);
}

/** 将 inner HTML 中的选区扩展为整颗 &lt;td&gt;/&lt;th&gt; 标签边界（用于源码选区对齐）。 */
export function expandRichInnerHtmlSelectionToCellTags(
  html: string,
  from: number,
  to: number
): { from: number; to: number } {
  let f = Math.max(0, from);
  let t = Math.max(f, to);
  const sliceBefore = html.slice(0, f);
  const tdIdx = sliceBefore.lastIndexOf("<td");
  const thIdx = sliceBefore.lastIndexOf("<th");
  const open = Math.max(tdIdx, thIdx);
  if (open >= 0) f = open;
  let tCloseTd = html.indexOf("</td>", t);
  let tCloseTh = html.indexOf("</th>", t);
  if (tCloseTd < 0) tCloseTd = Number.POSITIVE_INFINITY;
  if (tCloseTh < 0) tCloseTh = Number.POSITIVE_INFINITY;
  const close = Math.min(tCloseTd, tCloseTh);
  if (Number.isFinite(close)) {
    t = close + 5;
  }
  return { from: f, to: t };
}
