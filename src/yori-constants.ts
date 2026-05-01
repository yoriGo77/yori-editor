import type { YoriEditorSettings } from "./yori-types";

export const DEFAULT_HIGHLIGHT_COLOR = "#f4efe6";
export const DEFAULT_TEXT_COLOR = "#000000";

/** 会以 <img> 嵌入高级编辑区（与 Obsidian 支持的常见图片扩展名一致） */
export const ATTACHMENT_IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "svg",
  "bmp",
  "avif",
  "heic"
]);
/** 与 Obsidian 一致：`![[…]]` 内在笔记中内联播放 */
export const ATTACHMENT_VIDEO_EXTENSIONS = new Set(["mp4", "webm", "ogv", "ogg", "mov", "mkv"]);
/** `![[…]]` 内在笔记中显示播放器 */
export const ATTACHMENT_AUDIO_EXTENSIONS = new Set([
  "mp3",
  "wav",
  "m4a",
  "aac",
  "flac",
  "opus",
  "oga",
  "wma",
  "aiff",
  "caf"
]);
export const ATTACHMENT_RECORDING_EXTENSIONS = new Set(["mgg"]);
export const ATTACHMENT_PDF_EXTENSIONS = new Set(["pdf"]);
/** 音视频/PDF 等：独占一块且整体随 Backspace 删除，避免光标陷入控件或标题被合并 */
export const YORI_RICH_MEDIA_PARAGRAPH_CLASS = "yori-rich-media-paragraph";
export const YORI_RICH_ATOMIC_EMBED_CLASS = "yori-rich-atomic-embed";
/** 高级编辑 Grid 对齐用：复选框后「纯行内」正文包成一格，避免每个 span/文本块各占一行 */
export const YORI_RICH_TASK_LI_BODY_CLASS = "yori-rich-task-li-body";
/** 旧版高级编辑给图片包的可缩放层；现仅用于打开旧笔记时剥壳与脱水合 */
export const LEGACY_YORI_IMG_RESIZE_WRAP_CLASS = "yori-rich-img-resize-wrap";
/** 高级编辑内图片 Obsidian 式拖拽缩放（与 LEGACY 包装不同，保存时会正确脱水合） */
export const YORI_IMG_RESIZE_HOST_CLASS = "yori-rich-img-resize-host";
export const YORI_VIDEO_RESIZE_WRAP_CLASS = "yori-rich-video-resize-wrap";
/** 工具栏框内表示「当前未单独设行内字体/字号」时的文案（下拉列表不含此项） */
export const TOOLBAR_FONT_INHERIT_DISPLAY = "正文";

export const FONT_FAMILY_PRESETS: ReadonlyArray<{ label: string; value: string }> = [
  { label: "微软雅黑", value: "'Microsoft YaHei', 'Microsoft JhengHei', 'PingFang SC', sans-serif" },
  { label: "苹方", value: "'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif" },
  {
    label: "思源黑体",
    value: "'Source Han Sans SC', 'Noto Sans CJK SC', 'Microsoft YaHei', sans-serif"
  },
  {
    label: "思源宋体",
    value: "'Source Han Serif SC', 'Noto Serif CJK SC', 'SimSun', serif"
  },
  { label: "宋体", value: "'SimSun', 'Songti SC', 'Noto Serif SC', serif" },
  { label: "黑体", value: "'SimHei', 'Heiti SC', 'STHeiti', 'Microsoft YaHei', 'PingFang SC', sans-serif" },
  { label: "楷体", value: "'KaiTi', 'Kaiti SC', 'STKaiti', serif" },
  { label: "仿宋", value: "'FangSong', 'Fangsong SC', 'STFangsong', serif" },
  { label: "华文中宋", value: "'STZhongsong', 'SimSun', serif" },
  { label: "华文细黑", value: "'STXihei', 'Microsoft YaHei', sans-serif" },
  { label: "幼圆", value: "'YouYuan', 'Yuanti SC', 'Microsoft YaHei', fantasy" },
  { label: "隶书", value: "'LiSu', 'SimLi', cursive" },
  { label: "等宽", value: "'Consolas', 'Monaco', 'Noto Sans Mono', monospace" },
  { label: "Courier New", value: "'Courier New', Courier, monospace" },
  { label: "Segoe UI", value: "'Segoe UI', 'Segoe UI Variable', system-ui, sans-serif" },
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Helvetica", value: "Helvetica, Arial, sans-serif" },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
  { label: "Tahoma", value: "Tahoma, 'Segoe UI', sans-serif" },
  { label: "Trebuchet MS", value: "'Trebuchet MS', Helvetica, sans-serif" },
  { label: "Times New Roman", value: "'Times New Roman', Times, serif" },
  { label: "Georgia", value: "Georgia, 'Times New Roman', serif" },
  { label: "Palatino", value: "'Palatino Linotype', Palatino, 'Book Antiqua', serif" },
  { label: "Garamond", value: "Garamond, 'Palatino Linotype', serif" },
  { label: "Book Antiqua", value: "'Book Antiqua', Palatino, serif" },
  { label: "Cambria", value: "Cambria, Georgia, serif" },
  { label: "Calibri", value: "Calibri, 'Segoe UI', sans-serif" },
  { label: "Candara", value: "Candara, Verdana, sans-serif" },
  { label: "Corbel", value: "Corbel, 'Segoe UI', sans-serif" },
  { label: "Constantia", value: "Constantia, Georgia, serif" },
  { label: "Franklin Gothic", value: "'Franklin Gothic Medium', 'Arial Narrow', sans-serif" },
  { label: "Impact", value: "Impact, Haettenschweiler, sans-serif" },
  { label: "Comic Sans MS", value: "'Comic Sans MS', cursive" }
];

/** 旧版「黑体」预设栈（首项曾为微软雅黑）；磁盘上遗留此串时仍显示/勾选为「黑体」。 */
export const LEGACY_FONT_FAMILY_HEITI_STACK =
  "'Microsoft YaHei', 'PingFang SC', 'Noto Sans SC', sans-serif";

/** 高级编辑落盘时 &lt;span&gt;/&lt;font&gt; 的 style 仅保留这些键，避免 Firefox 等写入 --focus-ring、caret-color 等整页变量。 */
export const RICH_SAVE_SPAN_STYLE_KEYS = new Set<string>([
  "font-family",
  "font-size",
  "color",
  "font-weight",
  "font-style",
  "text-decoration",
  "text-decoration-line",
  "text-decoration-color",
  "text-decoration-style",
  "text-decoration-thickness"
]);

export const FONT_SIZE_PRESETS: ReadonlyArray<{ label: string; value: string }> = [
  { label: "8", value: "8px" },
  { label: "9", value: "9px" },
  { label: "10", value: "10px" },
  { label: "11", value: "11px" },
  { label: "12", value: "12px" },
  { label: "13", value: "13px" },
  { label: "14", value: "14px" },
  { label: "15", value: "15px" },
  { label: "16", value: "16px" },
  { label: "18", value: "18px" },
  { label: "20", value: "20px" },
  { label: "22", value: "22px" },
  { label: "24", value: "24px" },
  { label: "26", value: "26px" },
  { label: "28", value: "28px" },
  { label: "32", value: "32px" },
  { label: "36", value: "36px" },
  { label: "42", value: "42px" },
  { label: "48", value: "48px" },
  { label: "56", value: "56px" },
  { label: "64", value: "64px" },
  { label: "72", value: "72px" }
];

export const DEFAULT_SETTINGS: YoriEditorSettings = {
  toolbarMode: "markdown-plus",
  pluginUiLanguage: "zh",
  vaultLinkClickOpenMode: "smart",
  lastTextColor: DEFAULT_TEXT_COLOR,
  lastHighlightColor: DEFAULT_HIGHLIGHT_COLOR,
  lastFontFamily: "",
  lastFontSize: ""
};

export const RICH_LINE_SPACINGS = ["1.0", "1.5", "2.0", "2.5", "3.0"] as const;
/** 主按钮快捷应用的行间距（与预设列表中某项一致） */
export const RICH_LINE_SPACING_MAIN = "1.5";
export const RICH_ALIGN_STEPS: Array<{ cmd: string; icon: string; label: string }> = [
  { cmd: "justifyLeft", icon: "align-left", label: "左对齐" },
  { cmd: "justifyCenter", icon: "align-center", label: "居中对齐" },
  { cmd: "justifyRight", icon: "align-right", label: "右对齐" }
];
export const RICH_BORDER_WIDTH_PRESETS = [
  { label: "极细边框", width: "1px" },
  { label: "细边框", width: "2px" },
  { label: "粗边框", width: "3px" },
  { label: "极粗边框", width: "4px" }
] as const;
/** 段落边框默认色；线宽数值可与使用者再核对。 */
export const RICH_BORDER_DEFAULT_COLOR = "#af9165";
export const RICH_BORDER_MAIN_WIDTH = RICH_BORDER_WIDTH_PRESETS[0].width;

/** 高级编辑：段落边框容器（块级内容在内，便于在框内插入表格/hr 等） */
export const YORI_RICH_BORDERED_CLASS = "yori-rich-bordered";

/** 高级编辑：正文内 `#标签` 水合用 span class，保存前脱水为纯文本 */
export const YORI_RICH_INLINE_TAG_CLASS = "yori-rich-inline-tag";

/**
 * 推荐色网格（30 色：10 行 × 深/中/浅）。
 * 行顺序：灰阶、棕灰、黄、绿、草绿、橙、薄荷、蓝、紫、粉；列顺序：深、中、浅。
 */
export const RICH_COLOR_GRID_HUE_ROWS = [
  ["#000000", "#c6c6c6", "#ffffff"],
  ["#a4a098", "#dfd7c9", "#f4efe6"],
  ["#e6d99d", "#f1eac7", "#f8f5dd"],
  ["#b1b499", "#dddfc7", "#f0f1e4"],
  ["#cecf96", "#ebebc9", "#f3f4e0"],
  ["#f1c177", "#f6daaf", "#faead2"],
  ["#88cfba", "#b9dfd4", "#e3efec"],
  ["#91c5df", "#bfd7e4", "#eaf2f8"],
  ["#d2bedf", "#e3dae8", "#f2eff4"],
  ["#e1aca6", "#efdad8", "#faefee"]
] as const;

/** Markdown/原生工具栏高亮与字色共用，与高级编辑色盘一致；扁平顺序按行优先。 */
export const HIGHLIGHT_COLORS: string[] = RICH_COLOR_GRID_HUE_ROWS.flatMap((row) => [...row]);
