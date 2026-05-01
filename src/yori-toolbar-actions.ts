import type { InlineFormatKind, ToolbarAction } from "./yori-types";

export const INLINE_FORMAT_COMMAND_MAP = new Map<string, InlineFormatKind>([
  ["bold", "bold"],
  ["rich-bold", "bold"],
  ["italic", "italic"],
  ["rich-italic", "italic"],
  ["strike", "strikeThrough"],
  ["rich-strike", "strikeThrough"],
  ["rich-underline", "underline"]
]);

export function inlineFormatKindFromCommand(command: string): InlineFormatKind | null {
  return INLINE_FORMAT_COMMAND_MAP.get(command) ?? null;
}

export const MARKDOWN_TOOLBAR_ACTIONS: ToolbarAction[] = [
  { label: "字体", command: "font-family", icon: "whole-word", group: "text" },
  { label: "字号", command: "font-size", icon: "heading", group: "text" },
  { label: "加粗", command: "bold", icon: "bold", group: "text" },
  { label: "倾斜", command: "italic", icon: "italic", group: "text" },
  { label: "删除线", command: "strike", icon: "strikethrough", group: "text" },
  { label: "高亮", command: "highlight", icon: "highlighter", group: "text" },
  { label: "文字颜色", command: "text-color", icon: "type", group: "text" },
  { label: "项目符号", command: "bullet-list", icon: "list", group: "list" },
  { label: "编号", command: "numbered-list", icon: "list-ordered", group: "list" },
  { label: "任务列表", command: "checkbox", icon: "check-square", group: "list" },
  { label: "表格", command: "insert-table", icon: "table", group: "insert" },
  { label: "标注", command: "callout", icon: "message-square-quote", group: "insert" },
  { label: "脚注", command: "footnote", icon: "file-pen-line", group: "insert" },
  { label: "引用", command: "blockquote", icon: "text-quote", group: "insert" },
  { label: "分隔线", command: "divider", icon: "separator-horizontal", group: "insert" }
];

export const RICH_TOOLBAR_ACTIONS: ToolbarAction[] = [
  { label: "字体", command: "rich-font-family", icon: "whole-word", group: "text" },
  { label: "字号", command: "rich-font-size", icon: "heading", group: "text" },
  { label: "加粗", command: "rich-bold", icon: "bold", group: "text" },
  { label: "倾斜", command: "rich-italic", icon: "italic", group: "text" },
  { label: "下划线", command: "rich-underline", icon: "underline", group: "text" },
  { label: "删除线", command: "rich-strike", icon: "strikethrough", group: "text" },
  { label: "高亮", command: "rich-highlight", icon: "highlighter", group: "text" },
  { label: "文字颜色", command: "rich-text-color", icon: "type", group: "text" },
  { label: "对齐切换", command: "rich-align-cycle", icon: "align-left", group: "list" },
  { label: "行间距", command: "rich-line-spacing", icon: "list-chevrons-up-down", group: "list" },
  { label: "项目符号", command: "rich-bullet-list", icon: "list", group: "list" },
  { label: "编号", command: "rich-numbered-list", icon: "list-ordered", group: "list" },
  { label: "任务列表", command: "rich-task-list", icon: "check-square", group: "list" },
  { label: "插入表格", command: "rich-insert-table", icon: "table", group: "insert" },
  { label: "段落边框", command: "rich-paragraph-border", icon: "square", group: "insert" },
  { label: "分隔线", command: "rich-divider", icon: "separator-horizontal", group: "insert" },
  { label: "附件", command: "insert-attachment", icon: "paperclip", group: "insert" }
];
