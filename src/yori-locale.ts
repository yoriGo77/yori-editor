/** 插件自定义界面语言（与 Obsidian 应用界面语言独立）。 */
export type YoriUiLang = "zh" | "en";

export const YORI_UI_LANG_OPTIONS: ReadonlyArray<{ value: YoriUiLang; label: { zh: string; en: string } }> = [
  { value: "zh", label: { zh: "简体中文", en: "Chinese (Simplified)" } },
  { value: "en", label: { zh: "English", en: "English" } }
];

function pick<L extends Record<YoriUiLang, string>>(lang: YoriUiLang, row: L): string {
  return row[lang] ?? row.zh;
}

/** 工具栏正文未单独设置字体/字号时的占位文案 */
export function toolbarFontInheritLabel(lang: YoriUiLang): string {
  return pick(lang, { zh: "正文", en: "Body" });
}

const TOOLBAR_CMD: Record<string, Record<YoriUiLang, string>> = {
  "font-family": { zh: "字体", en: "Font" },
  "rich-font-family": { zh: "字体", en: "Font" },
  "font-size": { zh: "字号", en: "Size" },
  "rich-font-size": { zh: "字号", en: "Size" },
  bold: { zh: "加粗", en: "Bold" },
  "rich-bold": { zh: "加粗", en: "Bold" },
  italic: { zh: "倾斜", en: "Italic" },
  "rich-italic": { zh: "倾斜", en: "Italic" },
  strike: { zh: "删除线", en: "Strikethrough" },
  "rich-strike": { zh: "删除线", en: "Strikethrough" },
  "rich-underline": { zh: "下划线", en: "Underline" },
  highlight: { zh: "高亮", en: "Highlight" },
  "rich-highlight": { zh: "高亮", en: "Highlight" },
  "text-color": { zh: "文字颜色", en: "Text color" },
  "rich-text-color": { zh: "文字颜色", en: "Text color" },
  "bullet-list": { zh: "项目符号", en: "Bulleted list" },
  "rich-bullet-list": { zh: "项目符号", en: "Bulleted list" },
  "numbered-list": { zh: "编号", en: "Numbered list" },
  "rich-numbered-list": { zh: "编号", en: "Numbered list" },
  checkbox: { zh: "任务列表", en: "Task list" },
  "rich-task-list": { zh: "任务列表", en: "Task list" },
  "insert-table": { zh: "表格", en: "Table" },
  "rich-insert-table": { zh: "插入表格", en: "Insert table" },
  callout: { zh: "标注", en: "Callout" },
  footnote: { zh: "脚注", en: "Footnote" },
  blockquote: { zh: "引用", en: "Quote" },
  divider: { zh: "分隔线", en: "Divider" },
  "rich-divider": { zh: "分隔线", en: "Divider" },
  "rich-align-cycle": { zh: "对齐切换", en: "Cycle alignment" },
  "rich-line-spacing": { zh: "行间距", en: "Line spacing" },
  "rich-paragraph-border": { zh: "段落边框", en: "Paragraph border" },
  "insert-attachment": { zh: "附件", en: "Attachment" }
};

export function toolbarCommandLabel(lang: YoriUiLang, command: string): string {
  return TOOLBAR_CMD[command]?.[lang] ?? TOOLBAR_CMD[command]?.zh ?? command;
}

export function richAlignStepLabel(lang: YoriUiLang, cmd: string): string {
  const map: Record<string, Record<YoriUiLang, string>> = {
    justifyLeft: { zh: "左对齐", en: "Align left" },
    justifyCenter: { zh: "居中对齐", en: "Align center" },
    justifyRight: { zh: "右对齐", en: "Align right" }
  };
  return map[cmd]?.[lang] ?? map[cmd]?.zh ?? cmd;
}

export function richBorderWidthPresetLabel(lang: YoriUiLang, width: string): string {
  const map: Record<string, Record<YoriUiLang, string>> = {
    "1px": { zh: "极细边框", en: "Hairline" },
    "2px": { zh: "细边框", en: "Thin" },
    "3px": { zh: "粗边框", en: "Thick" },
    "4px": { zh: "极粗边框", en: "Extra thick" }
  };
  return map[width]?.[lang] ?? map[width]?.zh ?? width;
}

/** 设置页文案 */
export function settingsStrings(lang: YoriUiLang) {
  return {
    title: pick(lang, { zh: "Yori Editor 设置", en: "Yori Editor Settings" }),
    uiLanguage: pick(lang, { zh: "界面语言", en: "Display language" }),
    uiLanguageDesc: pick(lang, {
      zh: "本插件自带的设置页、工具栏按钮与右键菜单文案（不含 Obsidian 原生菜单）。",
      en: "Labels for this plugin’s settings, toolbar, and custom context menus (not Obsidian’s built‑in UI)."
    }),
    toolbarMode: pick(lang, { zh: "工具栏模式", en: "Toolbar mode" }),
    toolbarModeLine1: pick(lang, {
      zh: "原生增强：基于原生 markdown 的少量功能完善。",
      en: "Native enhancement: light tooling on top of the built‑in Markdown editor."
    }),
    toolbarModeLine2: pick(lang, {
      zh: "高级编辑：独立于 markdown 的强编辑模式，视觉与交互持续增强。",
      en: "Advanced editing: a richer visual editing surface independent of plain Markdown."
    }),
    modeNative: pick(lang, { zh: "原生增强", en: "Native enhancement" }),
    modeRich: pick(lang, { zh: "高级编辑", en: "Advanced editing" }),
    vaultLinkOpen: pick(lang, { zh: "笔记链接打开方式", en: "Note link opening" }),
    vaultLinkOpenDesc: pick(lang, {
      zh: "高级编辑模式中，笔记内的其他笔记链接，以哪种标签页形式打开。",
      en: "When using Advanced editing, how links to other notes open."
    }),
    vaultSmart: pick(lang, {
      zh: "智能（已打开则跳转，否则新开）",
      en: "Smart (reuse open leaf, otherwise new)"
    }),
    vaultNewTab: pick(lang, { zh: "总是新开标签页", en: "Always new tab" }),
    vaultCurrentTab: pick(lang, { zh: "在当前标签页打开", en: "Current tab" }),
    tipsHeading: pick(lang, { zh: "提示：", en: "Tips:" }),
    tipDesktopOnly: pick(lang, {
      zh: "本插件暂不支持移动端。",
      en: "This plugin supports desktop only (not mobile)."
    }),
    donate: pick(lang, { zh: "打赏", en: "Donate" })
  };
}

/** 高级编辑 · 正文右键（Obsidian Menu） */
export function richBodyMenuStrings(lang: YoriUiLang) {
  return {
    clearFormatting: pick(lang, { zh: "清除格式", en: "Clear formatting" }),
    insertInternalLink: pick(lang, { zh: "添加内部链接", en: "Insert internal link" }),
    insertNoteTag: pick(lang, { zh: "插入笔记标签", en: "Insert note tag" }),
    cut: pick(lang, { zh: "剪切", en: "Cut" }),
    copy: pick(lang, { zh: "复制", en: "Copy" }),
    paste: pick(lang, { zh: "粘贴", en: "Paste" })
  };
}

/** 表格自定义右键菜单（按钮文案） */
export function richTableMenuStrings(lang: YoriUiLang) {
  const m = richBodyMenuStrings(lang);
  return {
    ...m,
    backgroundColor: pick(lang, { zh: "背景颜色", en: "Background color" }),
    borderSettings: pick(lang, { zh: "边框设置", en: "Border" }),
    clearCellColor: pick(lang, { zh: "清除颜色", en: "Clear color" }),
    customColor: pick(lang, { zh: "自定义颜色...", en: "Custom color…" }),
    clearBorder: pick(lang, { zh: "清除边框", en: "Clear border" }),
    customBorderColor: pick(lang, { zh: "自定义边框颜色...", en: "Custom border color…" }),
    mergeCells: pick(lang, { zh: "合并选中单元格", en: "Merge selected cells" }),
    splitCell: pick(lang, { zh: "拆分当前单元格", en: "Split cell" }),
    addRow: pick(lang, { zh: "新增行", en: "Add row" }),
    deleteRow: pick(lang, { zh: "删除行", en: "Delete row" }),
    addColumn: pick(lang, { zh: "新增列", en: "Add column" }),
    deleteColumn: pick(lang, { zh: "删除列", en: "Delete column" }),
    convertNumbered: pick(lang, { zh: "转换为编号列", en: "Turn into numbered column" }),
    convertMarked: pick(lang, { zh: "转换为标记列", en: "Turn into checklist column" }),
    restoreNormalColumn: pick(lang, { zh: "恢复普通列", en: "Restore normal column" }),
    ariaPickColor: (hex: string) =>
      pick(lang, {
        zh: `选择颜色 ${hex}`,
        en: `Pick color ${hex}`
      }),
    ariaBorderColor: (hex: string) =>
      pick(lang, {
        zh: `边框颜色 ${hex}`,
        en: `Border color ${hex}`
      })
  };
}

/** 插入标签弹窗 */
export function richTagInsertStrings(lang: YoriUiLang) {
  return {
    title: pick(lang, { zh: "插入笔记标签", en: "Insert note tag" }),
    hint: pick(lang, {
      zh: "高级编辑模式在此插入标签，以免与正文的普通字符#混淆",
      en: "Insert tags here in Advanced editing so “#” doesn’t mix with normal text in the note."
    }),
    placeholder: pick(lang, { zh: "输入标签…", en: "Type a tag…" }),
    emptyNoQuery: pick(lang, {
      zh: "暂无标签历史，可直接输入新标签后回车。",
      en: "No tag history yet — type a new tag and press Enter."
    }),
    emptyNoMatch: pick(lang, {
      zh: "回车创建标签",
      en: "Press Enter to create the tag"
    })
  };
}

/** 库内链接选择器 */
export function vaultLinkPickerStrings(lang: YoriUiLang) {
  return {
    openNoteFirst: pick(lang, { zh: "请先打开一篇笔记。", en: "Open a note first." }),
    placeholder: pick(lang, { zh: "选择笔记或库内文件…", en: "Pick a note or file…" }),
    markdownNoEditor: pick(lang, {
      zh: "请聚焦 Markdown 编辑器后再试。",
      en: "Focus the Markdown editor and try again."
    })
  };
}

/** 自定义颜色弹窗标题（工具栏 / 段落边框 / 表格） */
export function pickColorModalStrings(lang: YoriUiLang) {
  return {
    customTextColor: pick(lang, { zh: "自定义文字颜色", en: "Custom text color" }),
    customHighlightColor: pick(lang, { zh: "自定义高亮颜色", en: "Custom highlight color" }),
    borderColor: pick(lang, { zh: "边框颜色", en: "Border color" }),
    cellBackgroundColor: pick(lang, { zh: "单元格背景色", en: "Cell background color" }),
    tableBorderColor: pick(lang, { zh: "表格边框颜色", en: "Table border color" })
  };
}

/** 工具栏「高亮 / 文字颜色」拆分按钮（含 Markdown 模式面板） */
export function toolbarColorSplitStrings(lang: YoriUiLang) {
  return {
    highlightMain: (hex: string) =>
      pick(lang, {
        zh: `高亮（上次颜色 ${hex}）`,
        en: `Highlight (last color ${hex})`
      }),
    highlightArrowLabel: pick(lang, { zh: "高亮颜色", en: "Highlight color" }),
    highlightSwatchAria: (hex: string) =>
      pick(lang, {
        zh: `高亮 ${hex}`,
        en: `Highlight ${hex}`
      }),
    clearHighlight: pick(lang, { zh: "取消高亮", en: "Remove highlight" }),
    textMain: (hex: string) =>
      pick(lang, {
        zh: `文字颜色（上次颜色 ${hex}）`,
        en: `Text color (last color ${hex})`
      }),
    textArrowLabel: pick(lang, { zh: "文字颜色", en: "Text color" }),
    textSwatchAria: (hex: string) =>
      pick(lang, {
        zh: `文字色 ${hex}`,
        en: `Text color ${hex}`
      }),
    clearTextColor: pick(lang, { zh: "取消文字颜色", en: "Remove text color" })
  };
}

/** 系统颜色选择 Modal（自定义颜色） */
export function colorPickModalStrings(lang: YoriUiLang) {
  return {
    hint: pick(lang, {
      zh: "点击下方色块打开系统颜色选择器，选好后点「应用」。",
      en: "Click the color swatch below to open the system color picker, then click Apply."
    }),
    pickerAria: pick(lang, { zh: "打开颜色选择器", en: "Open color picker" }),
    apply: pick(lang, { zh: "应用", en: "Apply" }),
    cancel: pick(lang, { zh: "取消", en: "Cancel" })
  };
}

/** 高级编辑内部分 Notice 文案 */
export function richNoticeStrings(lang: YoriUiLang) {
  return {
    pasteFailed: pick(lang, { zh: "无法粘贴，请改用 Ctrl+V。", en: "Couldn't paste — try Ctrl+V." }),
    cursorInCell: pick(lang, { zh: "请将光标放在表格单元格中。", en: "Place the caret in a table cell." }),
    cursorInTable: pick(lang, { zh: "请将光标放在表格中。", en: "Place the caret in a table." })
  };
}

/** 对齐循环按钮 title / aria */
export function richAlignToolbarStrings(lang: YoriUiLang) {
  return {
    titlePrefix: pick(lang, { zh: "对齐：", en: "Align: " }),
    ariaCycle: pick(lang, { zh: "切换对齐方式", en: "Cycle alignment" }),
    ariaCurrent: (stepLabel: string) =>
      pick(lang, {
        zh: `切换对齐方式，当前${stepLabel}`,
        en: `Cycle alignment, current: ${stepLabel}`
      })
  };
}

/** 段落边框下拉箭头按钮 accessibility */
export function richParagraphBorderSplitStrings(lang: YoriUiLang) {
  return {
    optionsAria: pick(lang, { zh: "段落边框选项", en: "Paragraph border options" })
  };
}

/** 插入表格模板（表头占位文案） */
export function richInsertTableTemplateHtml(lang: YoriUiLang): string {
  const headers =
    lang === "en"
      ? (["Header 1", "Header 2", "Header 3"] as const)
      : (["标题1", "标题2", "标题3"] as const);
  const [a, b, c] = headers;
  return `<table><tr><th>${a}</th><th>${b}</th><th>${c}</th></tr><tr><td><br></td><td><br></td><td><br></td></tr></table><p><br></p>`;
}

/** 行间距面板「默认」行 */
export function richLineSpacingToolbarStrings(lang: YoriUiLang) {
  return { defaultLabel: pick(lang, { zh: "默认", en: "Default" }) };
}
