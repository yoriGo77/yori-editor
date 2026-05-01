import { RangeSetBuilder, type Extension } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import type { App } from "obsidian";
import { MarkdownView } from "obsidian";

/** 隐藏 YORI 边界注释行 + 字体工具栏同步所需的插件状态（由 YoriEditorPlugin 强转传入）。 */
export interface YoriCmChromeHost {
  readonly settings: { toolbarMode: string };
  readonly richBlockStart: string;
  readonly richBlockEnd: string;
  richBoundaryDecoGeneration: number;
  markdownFontToolbarSyncRaf: number;
  refreshFontToolbarLabelsIfMounted(): void;
}

/**
 * 原生增强（源码）模式下隐藏 YORI_RICH 边界 HTML 注释行；磁盘与复制内容仍为完整 Markdown，
 * 切回高级编辑时仍可解析富文本块。
 */
export function createRichBoundaryMarkerHideExtension(host: YoriCmChromeHost): Extension {
  const startMarker = host.richBlockStart;
  const endMarker = host.richBlockEnd;
  const hiddenLine = Decoration.line({ class: "yori-cm-rich-boundary-hidden" });

  const buildDecorations = (view: EditorView): DecorationSet => {
    if (host.settings.toolbarMode === "rich") {
      return Decoration.none;
    }
    const doc = view.state.doc;
    const builder = new RangeSetBuilder<Decoration>();
    for (const { from, to } of view.visibleRanges) {
      const fromLine = doc.lineAt(from).number;
      const endPos = Math.min(to, doc.length);
      const toLine = doc.lineAt(endPos).number;
      for (let ln = fromLine; ln <= toLine; ln++) {
        const line = doc.line(ln);
        const t = line.text.trim();
        if (t === startMarker || t === endMarker) {
          builder.add(line.from, line.from, hiddenLine);
        }
      }
    }
    return builder.finish();
  };

  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      private lastGen: number;
      constructor(view: EditorView) {
        this.lastGen = host.richBoundaryDecoGeneration;
        this.decorations = buildDecorations(view);
      }
      update(u: ViewUpdate): void {
        const gen = host.richBoundaryDecoGeneration;
        if (u.docChanged || u.viewportChanged || gen !== this.lastGen) {
          this.lastGen = gen;
          this.decorations = buildDecorations(u.view);
        }
      }
    },
    { decorations: (v) => v.decorations }
  );
}

/** CodeMirror 内选区/文档变化时刷新字体工具栏（replaceRange/setSelection 不会触发 document.selectionchange）。 */
export function createMarkdownToolbarFontSyncExtension(host: YoriCmChromeHost): Extension {
  return ViewPlugin.fromClass(
    class {
      update(u: ViewUpdate): void {
        if (!u.selectionSet && !u.docChanged) return;
        if (host.markdownFontToolbarSyncRaf) {
          window.cancelAnimationFrame(host.markdownFontToolbarSyncRaf);
        }
        host.markdownFontToolbarSyncRaf = window.requestAnimationFrame(() => {
          host.markdownFontToolbarSyncRaf = 0;
          host.refreshFontToolbarLabelsIfMounted();
        });
      }
    }
  );
}

export function bumpRichBoundaryDecorations(app: App, host: Pick<YoriCmChromeHost, "richBoundaryDecoGeneration">): void {
  host.richBoundaryDecoGeneration++;
  app.workspace.iterateAllLeaves((leaf) => {
    const v = leaf.view;
    if (!(v instanceof MarkdownView) || v.getMode() !== "source") return;
    const cm = (v.editor as unknown as { cm?: EditorView }).cm;
    cm?.dispatch({});
  });
}
