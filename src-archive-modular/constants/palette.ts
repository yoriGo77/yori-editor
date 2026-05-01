/** 色彩图：10 行 × 3 列（深 / 中 / 浅），顺序与 UI 色块一致 */

export type PaletteSwatch = {
  hex: string;
  /** 中文标签（可选，用于无障碍 title） */
  label?: string;
};

export type PaletteRow = {
  category: string;
  deep: PaletteSwatch;
  medium: PaletteSwatch;
  light: PaletteSwatch;
};

export const NEUTRAL_ROW: PaletteRow = {
  category: '中性',
  deep: { hex: '#000000', label: '黑色' },
  medium: { hex: '#c6c6c6', label: '灰色' },
  light: { hex: '#ffffff', label: '白色' },
};

/** 色盘主体（与配图一致的 9 组 + 顶部中性色一行） */
export const PALETTE_ROWS: PaletteRow[] = [
  NEUTRAL_ROW,
  {
    category: '棕灰',
    deep: { hex: '#a4a098', label: '深棕灰' },
    medium: { hex: '#f4f4f4', label: '中棕灰' },
    light: { hex: '#f4efe6', label: '浅棕灰' },
  },
  {
    category: '黄',
    deep: { hex: '#e6d99d', label: '深黄' },
    medium: { hex: '#f1eac7', label: '中黄' },
    light: { hex: '#f8f5dd', label: '浅黄' },
  },
  {
    category: '绿',
    deep: { hex: '#b1b499', label: '深绿' },
    medium: { hex: '#dddfc7', label: '中绿' },
    light: { hex: '#f0f1e4', label: '浅绿' },
  },
  {
    category: '草绿',
    deep: { hex: '#cecf96', label: '深草绿' },
    medium: { hex: '#ebebc9', label: '中草绿' },
    light: { hex: '#f3f4e0', label: '浅草绿' },
  },
  {
    category: '橙',
    deep: { hex: '#f1c177', label: '深橙' },
    medium: { hex: '#f6daaf', label: '中橙' },
    light: { hex: '#faead2', label: '浅橙' },
  },
  {
    category: '薄荷',
    deep: { hex: '#88cfba', label: '深薄荷' },
    medium: { hex: '#b9dfd4', label: '中薄荷' },
    light: { hex: '#e3efec', label: '浅薄荷' },
  },
  {
    category: '蓝',
    deep: { hex: '#91c5df', label: '深蓝' },
    medium: { hex: '#bfd7e4', label: '中蓝' },
    light: { hex: '#eaf2f8', label: '浅蓝' },
  },
  {
    category: '紫',
    deep: { hex: '#d2bedf', label: '深紫' },
    medium: { hex: '#e3dae8', label: '中紫' },
    light: { hex: '#f2eff4', label: '浅紫' },
  },
  {
    category: '粉',
    deep: { hex: '#e1aca6', label: '深粉' },
    medium: { hex: '#efdad8', label: '中粉' },
    light: { hex: '#faefee', label: '浅粉' },
  },
];

/** 用于工具栏背景、分隔线等 UI chrome（参考用户提供色调） */
export const UI_CHROME = {
  toolbarBg: '#ffffff',
  toolbarBorder: '#dfd7c9',
  mutedBg: '#efe8e0',
  accent: '#99876c',
  accentSoft: '#af9165',
  toggleActive: '#dfd7c9',
} as const;

/** 扁平色块列表（深→中→浅，按行展开），用于下拉色盘 */
export function flattenPalette(rows: PaletteRow[]): PaletteSwatch[] {
  const out: PaletteSwatch[] = [];
  for (const row of rows) {
    out.push(row.deep, row.medium, row.light);
  }
  return out;
}
