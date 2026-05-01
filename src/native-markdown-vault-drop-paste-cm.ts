import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

/** 源码模式：侧栏/库文件拖入插入链接；纯 http(s) URL 粘贴为 Markdown 外链。 */
export interface NativeMarkdownVaultDropPasteCmHost {
  handleNativeSourceVaultDrop(evt: DragEvent, view: EditorView): boolean;
  handleNativeSourcePasteBareUrl(evt: ClipboardEvent, view: EditorView): boolean;
}

export function createNativeMarkdownVaultDropPasteExtension(host: NativeMarkdownVaultDropPasteCmHost): Extension {
  return EditorView.domEventHandlers({
    drop(evt, view) {
      return host.handleNativeSourceVaultDrop(evt, view);
    },
    paste(evt, view) {
      return host.handleNativeSourcePasteBareUrl(evt, view);
    }
  });
}
