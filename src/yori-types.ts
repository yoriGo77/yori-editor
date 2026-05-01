import type { YoriUiLang } from "./yori-locale";

export type ToolbarMode = "markdown-plus" | "rich";

/** 高级编辑内点击库内链接（含拖入、手写等生成的 `[[…]]` 水合链接）时的标签页策略 */
export type VaultLinkClickOpenMode = "smart" | "new-tab" | "current-tab";

export interface YoriEditorSettings {
  toolbarMode: ToolbarMode;
  /** 插件自带文案语言（与 Obsidian 应用界面语言无关） */
  pluginUiLanguage: YoriUiLang;
  vaultLinkClickOpenMode: VaultLinkClickOpenMode;
  /** Markdown / 高级编辑共用：主按钮与命令将应用的上次文字颜色 */
  lastTextColor: string;
  /** Markdown / 高级编辑共用：主按钮与命令将应用的上次高亮底色 */
  lastHighlightColor: string;
  /** 工具栏字体预设 CSS 值，空字符串表示继承默认 */
  lastFontFamily: string;
  /** 工具栏字号预设，空字符串表示继承，如 16px */
  lastFontSize: string;
}

export type ToolbarAction = {
  label: string;
  command: string;
  icon: string;
  group: "text" | "list" | "insert" | "stats";
};

export type InlineFormatKind = "bold" | "italic" | "underline" | "strikeThrough";
