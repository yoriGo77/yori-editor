import { Notice, type Command, type Editor } from "obsidian";

import { RICH_LINE_SPACING_MAIN } from "./yori-constants";
import type { YoriEditorSettings } from "./yori-types";

/**
 * 命令注册所需的插件方法集合（实现均在 YoriEditorPlugin 上为 private，
 * 通过 `registerYoriCommands(this as unknown as YoriEditorCommandsSelf)` 传入）。
 */
export interface YoriEditorCommandsSelf {
  readonly settings: YoriEditorSettings;

  addCommand(command: Command): void;

  runNativeOnly(
    nativeIds: string[],
    featureName: string,
    extra?: { idFragments?: string[][]; nameFragments?: string[][] }
  ): void;

  applyHighlightColor(editor: Editor, color: string): void;
  applyTextColor(editor: Editor, color: string): void;
  applyFontFamilyMarkdown(editor: Editor, cssValue: string): void;
  applyFontSizeMarkdown(editor: Editor, cssValue: string): void;
  applyMarkdownTaskListFromUser(editor: Editor | undefined): void;
  pickLocalFilesForAttachment(): void;

  runRichCommand(command: string, value?: string): void;
  cycleRichAlignmentFromCurrent(): void;
  applyRichHighlightColor(color: string): void;
  applyRichTextColor(color: string): void;
  applyRichFontFamily(value: string): void;
  applyRichFontSize(value: string): void;
  runRichInsertHtml(html: string): void;
  openVaultLinkPicker(mode: "rich" | "markdown", editor: Editor | null | undefined): void;
  getActiveEditor(): Editor | null;
  applyRichLineSpacing(lineHeight: string | null): void;
  toggleRichParagraphBorder(): void;
  persistRichEditor(): Promise<void>;
}

export function registerYoriCommands(plugin: YoriEditorCommandsSelf): void {
  const p = plugin;

  p.addCommand({
    id: "bold",
    name: "文本加粗",
    editorCallback: () => p.runNativeOnly(["editor:toggle-bold", "editor:bold"], "加粗")
  });
  p.addCommand({
    id: "italic",
    name: "文本倾斜",
    editorCallback: () => p.runNativeOnly(["editor:toggle-italics", "editor:italic"], "倾斜")
  });
  p.addCommand({
    id: "strike",
    name: "删除线",
    editorCallback: () => p.runNativeOnly(["editor:toggle-strikethrough", "editor:strikethrough"], "删除线")
  });
  p.addCommand({
    id: "highlight",
    name: "高亮文本",
    editorCallback: (editor) => p.applyHighlightColor(editor, p.settings.lastHighlightColor)
  });
  p.addCommand({
    id: "text-color",
    name: "设置文字颜色",
    editorCallback: (editor) => p.applyTextColor(editor, p.settings.lastTextColor)
  });
  p.addCommand({
    id: "font-family",
    name: "字体（上次预设）",
    editorCallback: (editor) => p.applyFontFamilyMarkdown(editor, p.settings.lastFontFamily)
  });
  p.addCommand({
    id: "font-size",
    name: "字号（上次预设）",
    editorCallback: (editor) => p.applyFontSizeMarkdown(editor, p.settings.lastFontSize)
  });
  p.addCommand({
    id: "bullet-list",
    name: "切换项目符号",
    editorCallback: () =>
      p.runNativeOnly(
        [
          "editor:toggle-bullet-list",
          "editor:toggle-bulleted-list",
          "editor:bullet-list",
          "editor:toggle-unordered-list"
        ],
        "项目符号",
        {
          idFragments: [["toggle", "bullet", "list"]],
          nameFragments: [["toggle", "bullet", "list"]]
        }
      )
  });
  p.addCommand({
    id: "numbered-list",
    name: "切换编号",
    editorCallback: () =>
      p.runNativeOnly(
        [
          "editor:toggle-numbered-list",
          "editor:toggle-ordered-list",
          "editor:numbered-list",
          "editor:ordered-list"
        ],
        "编号列表",
        {
          idFragments: [
            ["toggle", "numbered", "list"],
            ["toggle", "ordered", "list"]
          ],
          nameFragments: [
            ["toggle", "numbered", "list"],
            ["toggle", "ordered", "list"]
          ]
        }
      )
  });
  p.addCommand({
    id: "checkbox",
    name: "任务列表（与内置一致，无法调用原生命令时改 Markdown 行）",
    editorCallback: (editor) => {
      p.applyMarkdownTaskListFromUser(editor);
    }
  });
  p.addCommand({
    id: "insert-table",
    name: "插入基础表格",
    editorCallback: () => p.runNativeOnly(["editor:insert-table", "editor:table"], "表格")
  });
  p.addCommand({
    id: "callout",
    name: "插入标注（Callout）",
    editorCallback: () => p.runNativeOnly(["editor:insert-callout", "editor:callout"], "标注")
  });
  p.addCommand({
    id: "footnote",
    name: "插入脚注",
    editorCallback: () => p.runNativeOnly(["editor:insert-footnote", "editor:footnote"], "脚注")
  });
  p.addCommand({
    id: "blockquote",
    name: "插入引用块",
    editorCallback: () => p.runNativeOnly(["editor:toggle-blockquote", "editor:blockquote"], "引用")
  });
  p.addCommand({
    id: "divider",
    name: "插入分隔线",
    editorCallback: () =>
      p.runNativeOnly(["editor:insert-horizontal-rule", "editor:horizontal-rule"], "分隔线")
  });
  p.addCommand({
    id: "insert-image-template",
    name: "插入图片/附件模板",
    editorCallback: () =>
      p.runNativeOnly(["editor:insert-embed", "editor:image-embed", "editor:embed"], "图片/附件")
  });
  p.addCommand({
    id: "insert-attachment",
    name: "插入附件（从本地选择）",
    callback: () => p.pickLocalFilesForAttachment()
  });

  p.addCommand({
    id: "rich-bold",
    name: "高级编辑：加粗",
    callback: () => p.runRichCommand("bold")
  });
  p.addCommand({
    id: "rich-italic",
    name: "高级编辑：倾斜",
    callback: () => p.runRichCommand("italic")
  });
  p.addCommand({
    id: "rich-underline",
    name: "高级编辑：下划线",
    callback: () => p.runRichCommand("underline")
  });
  p.addCommand({
    id: "rich-strike",
    name: "高级编辑：删除线",
    callback: () => p.runRichCommand("strikeThrough")
  });
  p.addCommand({
    id: "rich-align-cycle",
    name: "高级编辑：循环切换对齐",
    callback: () => p.cycleRichAlignmentFromCurrent()
  });
  p.addCommand({
    id: "rich-highlight",
    name: "高级编辑：高亮（上次颜色）",
    callback: () => p.applyRichHighlightColor(p.settings.lastHighlightColor)
  });
  p.addCommand({
    id: "rich-text-color",
    name: "高级编辑：文字颜色（上次颜色）",
    callback: () => p.applyRichTextColor(p.settings.lastTextColor)
  });
  p.addCommand({
    id: "rich-font-family",
    name: "高级编辑：字体（上次预设）",
    callback: () => p.applyRichFontFamily(p.settings.lastFontFamily)
  });
  p.addCommand({
    id: "rich-font-size",
    name: "高级编辑：字号（上次预设）",
    callback: () => p.applyRichFontSize(p.settings.lastFontSize)
  });
  p.addCommand({
    id: "rich-bullet-list",
    name: "高级编辑：项目符号",
    callback: () => p.runRichCommand("insertUnorderedList")
  });
  p.addCommand({
    id: "rich-numbered-list",
    name: "高级编辑：编号列表",
    callback: () => p.runRichCommand("insertOrderedList")
  });
  p.addCommand({
    id: "rich-task-list",
    name: "高级编辑：任务列表",
    callback: () => p.runRichCommand("insertTaskList")
  });
  p.addCommand({
    id: "rich-insert-table",
    name: "高级编辑：插入表格",
    callback: () =>
      p.runRichInsertHtml(
        "<table><tr><th>标题1</th><th>标题2</th><th>标题3</th></tr><tr><td><br></td><td><br></td><td><br></td></tr></table><p><br></p>"
      )
  });
  p.addCommand({
    id: "rich-divider",
    name: "高级编辑：插入分隔线",
    callback: () => p.runRichInsertHtml("<hr />")
  });
  p.addCommand({
    id: "insert-vault-link",
    name: "插入库内链接…",
    callback: () =>
      p.openVaultLinkPicker(p.settings.toolbarMode === "rich" ? "rich" : "markdown", p.getActiveEditor())
  });
  p.addCommand({
    id: "rich-line-spacing",
    name: `高级编辑：行间距（${RICH_LINE_SPACING_MAIN}）`,
    callback: () => p.applyRichLineSpacing(RICH_LINE_SPACING_MAIN)
  });
  p.addCommand({
    id: "rich-paragraph-border",
    name: "高级编辑：段落边框",
    callback: () => p.toggleRichParagraphBorder()
  });
  p.addCommand({
    id: "rich-save",
    name: "高级编辑：保存到笔记（Ctrl/Cmd+S）",
    callback: async () => {
      await p.persistRichEditor().then(
        () => {
          new Notice("已保存");
        },
        () => {
          new Notice("保存失败");
        }
      );
    }
  });
}
