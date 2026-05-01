import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { MarkdownRenderChild, type MarkdownPostProcessorContext } from "obsidian";

/** Live Preview / workspace 桥接所需插件能力（实现均在 YoriEditorPlugin 私有方法上）。 */
export interface NativeMarkedCheckboxBridgeHost {
  readonly nativeMarkedCheckboxBridgeHosts: WeakSet<HTMLElement>;
  readonly settings: { toolbarMode: string };
  readonly richEditorEl: HTMLDivElement | null;

  handleNativeMarkedTableCheckboxFromEvent(evt: Event, sourcePathHint?: string): void;
  handleNativeMarkedTableCheckboxFromInput(
    input: HTMLInputElement,
    sourcePathHint?: string,
    evt?: Event
  ): void;
  containerContainsNodeShadowAware(container: HTMLElement, node: Node | null): boolean;
  resolveTableForCheckbox(input: HTMLInputElement): HTMLTableElement | null;
  isNativePreviewTaskListCheckbox(input: HTMLInputElement): boolean;
}

/**
 * Live Preview 块级容器内的事件未必冒泡到 document；在 post-processor 根节点上委托监听，
 * 并用 ctx.sourcePath 绑定待更新的笔记（避免多窗格 / Shadow 下找错 MarkdownView）。
 *
 * 注意：Obsidian 常会净化预览 HTML，`th[data-yori-col-type="marked"]` 在预览 DOM 里可能不存在，
 * 表格写回时以磁盘 inner 校验标记列。任务列表（ul.contains-task-list）亦挂接，便于块内 change 冒泡。
 */
export function attachYoriNativeMarkedCheckboxBridge(
  host: NativeMarkedCheckboxBridgeHost,
  el: HTMLElement,
  ctx: MarkdownPostProcessorContext
): void {
  const pathHint = ctx.sourcePath;

  const hasBridgeCheckbox = (root: HTMLElement | ShadowRoot): boolean => {
    if (
      root.querySelector(
        "table input[type='checkbox'],table input[type=\"checkbox\"],ul.contains-task-list input[type='checkbox'],ul.contains-task-list input[type=\"checkbox\"],li.task-list-item input[type='checkbox'],li.task-list-item input[type=\"checkbox\"]"
      )
    ) {
      return true;
    }
    for (const e of Array.from(root.querySelectorAll("*"))) {
      if (e instanceof Element && e.shadowRoot && hasBridgeCheckbox(e.shadowRoot)) {
        return true;
      }
    }
    return false;
  };

  const tryInstallBridge = (): void => {
    if (!el.isConnected || host.nativeMarkedCheckboxBridgeHosts.has(el)) return;
    if (!hasBridgeCheckbox(el)) return;
    host.nativeMarkedCheckboxBridgeHosts.add(el);

    class NativeMarkedCbBridge extends MarkdownRenderChild {
      private readonly disposers: Array<() => void> = [];

      constructor(rootEl: HTMLElement) {
        super(rootEl);
        const onCommit = (evt: Event): void => {
          if (host.settings.toolbarMode === "rich") return;
          host.handleNativeMarkedTableCheckboxFromEvent(evt, pathHint);
        };
        rootEl.addEventListener("change", onCommit, true);
        rootEl.addEventListener("input", onCommit, true);
        this.disposers.push(() => rootEl.removeEventListener("change", onCommit, true));
        this.disposers.push(() => rootEl.removeEventListener("input", onCommit, true));

        const visitForInputs = (node: Node): void => {
          if (node instanceof HTMLInputElement && node.type === "checkbox") {
            if (!host.containerContainsNodeShadowAware(rootEl, node)) return;
            const tbl = host.resolveTableForCheckbox(node);
            const task = host.isNativePreviewTaskListCheckbox(node);
            if (!tbl && !task) return;
            node.addEventListener("change", onCommit, true);
            node.addEventListener("input", onCommit, true);
            this.disposers.push(() => node.removeEventListener("change", onCommit, true));
            this.disposers.push(() => node.removeEventListener("input", onCommit, true));
            const onClickCapture = (): void => {
              queueMicrotask(() => {
                if (!node.isConnected) return;
                if (host.settings.toolbarMode === "rich") return;
                host.handleNativeMarkedTableCheckboxFromInput(node, pathHint);
              });
            };
            node.addEventListener("click", onClickCapture, true);
            this.disposers.push(() => node.removeEventListener("click", onClickCapture, true));
          }
          if (node instanceof Element) {
            for (const ch of Array.from(node.children)) visitForInputs(ch);
            const sr = node.shadowRoot;
            if (sr) {
              for (const ch of Array.from(sr.children)) visitForInputs(ch);
            }
          } else if (node instanceof ShadowRoot) {
            for (const ch of Array.from(node.children)) visitForInputs(ch);
          }
        };
        visitForInputs(rootEl);
      }

      onunload(): void {
        host.nativeMarkedCheckboxBridgeHosts.delete(this.containerEl);
        for (const d of this.disposers) d();
      }
    }

    ctx.addChild(new NativeMarkedCbBridge(el));
  };

  class NativeMarkedCbSetupObserver extends MarkdownRenderChild {
    private mo: MutationObserver | null = null;

    constructor(rootEl: HTMLElement) {
      super(rootEl);
      tryInstallBridge();
      queueMicrotask(() => tryInstallBridge());
      requestAnimationFrame(() => tryInstallBridge());

      this.mo = new MutationObserver(() => tryInstallBridge());
      this.mo.observe(rootEl, { childList: true, subtree: true });
    }

    onunload(): void {
      this.mo?.disconnect();
      this.mo = null;
    }
  }

  ctx.addChild(new NativeMarkedCbSetupObserver(el));
}

/** Live Preview 块内 checkbox：在 CodeMirror 根 domEventHandlers 捕获 change/input（补 document/后处理链路的死角）。 */
export function createNativeMarkedCheckboxLivePreviewExtension(host: NativeMarkedCheckboxBridgeHost): Extension {
  return EditorView.domEventHandlers({
    change: (evt, _view) => {
      if (host.settings.toolbarMode === "rich") return false;
      host.handleNativeMarkedTableCheckboxFromEvent(evt);
      return false;
    },
    input: (evt, _view) => {
      if (host.settings.toolbarMode === "rich") return false;
      host.handleNativeMarkedTableCheckboxFromEvent(evt);
      return false;
    }
  });
}

export function createWorkspaceMarkedCheckboxPointerHandler(
  host: NativeMarkedCheckboxBridgeHost
): (evt: PointerEvent) => void {
  return (evt: PointerEvent) => {
    if (host.settings.toolbarMode === "rich") return;
    const t = evt.target;
    if (t instanceof HTMLInputElement && t.type === "checkbox") return;
    queueMicrotask(() => {
      if (host.settings.toolbarMode === "rich") return;
      let hit: HTMLInputElement | null = null;
      try {
        for (const el of document.elementsFromPoint(evt.clientX, evt.clientY)) {
          if (el instanceof HTMLInputElement && el.type === "checkbox") {
            hit = el;
            break;
          }
        }
      } catch {
        return;
      }
      if (!hit) return;
      const tbl = host.resolveTableForCheckbox(hit);
      if (!tbl) return;
      if (host.richEditorEl && host.containerContainsNodeShadowAware(host.richEditorEl, tbl)) return;
      host.handleNativeMarkedTableCheckboxFromInput(hit, undefined, evt);
    });
  };
}
