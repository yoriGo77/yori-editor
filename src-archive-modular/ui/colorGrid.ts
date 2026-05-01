import { PALETTE_ROWS, type PaletteRow } from '../constants/palette';

export type ColorPickHandler = (hex: string) => void;

/** 按配图顺序渲染 10×3（中性占第一行）网格 */
export function createPaletteGrid(
  parent: HTMLElement,
  onPick: ColorPickHandler,
  opts?: { selectedHex?: string },
): HTMLElement {
  const wrap = parent.createDiv({ cls: 'yori-palette-grid' });
  for (const row of PALETTE_ROWS as PaletteRow[]) {
    const rowEl = wrap.createDiv({ cls: 'yori-palette-row' });
    const cells: PaletteRow['deep'][] = [row.deep, row.medium, row.light];
    for (const swatch of cells) {
      const cell = rowEl.createDiv({
        cls: 'yori-palette-swatch',
        attr: { title: swatch.label ?? swatch.hex },
      });
      cell.style.backgroundColor = swatch.hex;
      if (
        opts?.selectedHex &&
        swatch.hex.toLowerCase() === opts.selectedHex.toLowerCase()
      ) {
        cell.addClass('yori-palette-swatch--selected');
      }
      cell.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        onPick(swatch.hex);
      });
    }
  }
  return wrap;
}
