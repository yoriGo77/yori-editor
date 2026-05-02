import { MarkdownView, type App, type Editor, type TFile } from "obsidian";
export function readMarkdownViewText(view: MarkdownView): string {
  try {
    if (view.getMode() === "source") {
      return view.editor.getValue();
    }
    return view.getViewData();
  } catch {
    return view.editor.getValue();
  }
}

/** 写入正文：`setViewData` 以便预览与 TextFileView.data 一致，并尝试 `requestSave`。 */
export function writeMarkdownViewText(view: MarkdownView, text: string): void {
  try {
    view.setViewData(text, false);
  } catch {
    view.editor.setValue(text);
  }
  try {
    view.requestSave();
  } catch {
    /* ignore */
  }
}

export function insertMarkdownAtEditorPosition(
  editor: Editor,
  pos: { line: number; ch: number },
  md: string
): void {
  editor.replaceRange(md, pos, pos);
  const startOff = editor.posToOffset(pos);
  editor.setCursor(editor.offsetToPos(startOff + md.length));
}

/** 高级编辑打开时隐藏了源编辑器，但 leaf 获得焦点时仍可能聚焦 CM，需主动 blur 才能让高级编辑区拿到光标 */
export function blurMarkdownSourceEditor(view: MarkdownView): void {
  try {
    view.editor.blur();
  } catch {
    /* ignore */
  }
  try {
    const cm = (view.editor as unknown as { cm?: { contentDOM?: HTMLElement } }).cm;
    cm?.contentDOM?.blur();
  } catch {
    /* ignore */
  }
  const ae = activeDocument.activeElement;
  if (!ae || !view.containerEl.contains(ae)) return;
  const inCm =
    ae.closest(".cm-editor") ||
    ae.closest(".cm-scroller") ||
    ae.closest(".cm-content") ||
    ae.closest(".markdown-source-view");
  if (inCm && ae.instanceOf(HTMLElement)) {
    ae.blur();
  }
}

/**
 * 读取当前笔记正文原文：优先任一打开中的 Markdown 视图缓冲区（含未保存修改），避免原生↔高级切换丢稿。
 * 与 `readMarkdownViewText` 共用同一套读法（含异常时回落 `editor.getValue()`）。
 */
export function getLiveMarkdownRawForFile(
  app: App,
  file: TFile,
  richHostView: MarkdownView | null
): string | null {
  const fromView = (v: MarkdownView | null): string | null => {
    if (!v?.file || v.file.path !== file.path) return null;
    return readMarkdownViewText(v);
  };

  const a = fromView(richHostView);
  if (a != null) return a;
  const b = fromView(app.workspace.getActiveViewOfType(MarkdownView));
  if (b != null) return b;

  let fromLeaf: string | null = null;
  app.workspace.iterateAllLeaves((leaf) => {
    if (fromLeaf != null) return;
    const v = leaf.view;
    if (v instanceof MarkdownView && v.file?.path === file.path) {
      const s = fromView(v);
      if (s != null) fromLeaf = s;
    }
  });
  return fromLeaf;
}
