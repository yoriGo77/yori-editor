import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import {
  App,
  Editor,
  MarkdownView,
  type MarkdownViewModeType,
  Menu,
  WorkspaceLeaf,
  Notice,
  Plugin,
  TFile,
  loadPdfJs,
  normalizePath,
  parseLinktext,
  setIcon,
  type MarkdownPostProcessorContext
} from "obsidian";


import type { InlineFormatKind, ToolbarAction, ToolbarMode, YoriEditorSettings } from "./src/yori-types";
import {
  ATTACHMENT_AUDIO_EXTENSIONS,
  ATTACHMENT_IMAGE_EXTENSIONS,
  ATTACHMENT_PDF_EXTENSIONS,
  ATTACHMENT_RECORDING_EXTENSIONS,
  ATTACHMENT_VIDEO_EXTENSIONS,
  DEFAULT_SETTINGS,
  FONT_FAMILY_PRESETS,
  FONT_SIZE_PRESETS,
  HIGHLIGHT_COLORS,
  RICH_COLOR_GRID_HUE_ROWS,
  LEGACY_FONT_FAMILY_HEITI_STACK,
  LEGACY_YORI_IMG_RESIZE_WRAP_CLASS,
  RICH_ALIGN_STEPS,
  RICH_BORDER_DEFAULT_COLOR,
  RICH_BORDER_MAIN_WIDTH,
  RICH_BORDER_WIDTH_PRESETS,
  RICH_LINE_SPACINGS,
  YORI_IMG_RESIZE_HOST_CLASS,
  YORI_RICH_ATOMIC_EMBED_CLASS,
  YORI_RICH_BORDERED_CLASS,
  YORI_RICH_MEDIA_PARAGRAPH_CLASS,
  YORI_VIDEO_RESIZE_WRAP_CLASS
} from "./src/yori-constants";
import { markdownToInitialRichHtml } from "./src/markdown-to-rich-html";
import { YoriColorPickModal } from "./src/yori-color-modal";
import {
  inlineFormatKindFromCommand,
  MARKDOWN_TOOLBAR_ACTIONS,
  RICH_TOOLBAR_ACTIONS
} from "./src/yori-toolbar-actions";
import { YoriEditorSettingTab } from "./src/yori-settings-tab";
import { registerYoriCommands, type YoriEditorCommandsSelf } from "./src/register-commands";
import { openVaultLinkPickerModal, type VaultLinkPickerHost } from "./src/open-vault-link-picker";
import {
  executeObsidianCommandById as obsidianExecuteCommandById,
  tryExecuteCommandIds as obsidianTryExecuteCommandIds,
  tryRunNativeOnlyQuiet as obsidianTryRunNativeOnlyQuiet
} from "./src/obsidian-native-command-bridge";
import {
  blurMarkdownSourceEditor,
  getLiveMarkdownRawForFile,
  insertMarkdownAtEditorPosition,
  readMarkdownViewText,
  writeMarkdownViewText
} from "./src/obsidian-markdown-view-io";
import {
  attachYoriNativeMarkedCheckboxBridge as installNativeMarkedCheckboxBridge,
  createNativeMarkedCheckboxLivePreviewExtension,
  createWorkspaceMarkedCheckboxPointerHandler,
  type NativeMarkedCheckboxBridgeHost
} from "./src/native-marked-checkbox-bridge";
import { pullDataTransferStringItemsAsync, snapshotRichDataTransferSync } from "./src/data-transfer-snapshot";
import {
  bumpRichBoundaryDecorations as bumpRichBoundaryDecorationsWorkspace,
  createMarkdownToolbarFontSyncExtension,
  createRichBoundaryMarkerHideExtension,
  type YoriCmChromeHost
} from "./src/rich-boundary-cm-extensions";
import { isBareHttpUrlPaste, markdownInlineLinkFromBareUrl } from "./src/bare-url-markdown";
import { escapeHtml, richExternalLinkHtmlFromUrl } from "./src/rich-html-escape";
import { getRichEditorInnerHtmlForUndoSnapshot } from "./src/rich-html-undo-snapshot";
import {
  createNativeMarkdownVaultDropPasteExtension,
  type NativeMarkdownVaultDropPasteCmHost
} from "./src/native-markdown-vault-drop-paste-cm";
import {
  hydratePreviewImageEmbeds,
  hydrateRichInlineTagsInRichEditor,
  replaceImageEmbedsInTextNode,
  replaceWikilinksInTextNodeForHydrate,
  type EmbedHydrateInTextNodeHost
} from "./src/embed-hydrate-text-nodes";
import {
  buildOrderedHydrateVaultSourcePaths,
  resolveVaultLinkDestFromHydrateSources
} from "./src/vault-link-hydrate-resolve";
import {
  ingestDataTransferVaultLinkPieces as ingestDataTransferVaultLinkPiecesFromDt,
  ingestVaultLinkPiecesFromSnapshot as ingestVaultLinkPiecesFromSnapshotCore
} from "./src/vault-drop-ingest";
import { copyFileIntoVaultAsAttachment, markdownLinkForDroppedVaultFile } from "./src/vault-attachment-markdown";
import { collectHtmlTablesDeep, containerContainsNodeShadowAware } from "./src/dom-shadow-helpers";
import {
  applyRichCheckboxCheckedFlagsToEditorInTreeOrder,
  applyRichCheckboxCheckedStateFromAttributesAfterLoad,
  extractRichCheckboxCheckedFlagsFromHtmlFragment
} from "./src/rich-checkbox-html";
import {
  cleanupRichFontSpanSoupInTree,
  dehydrateRichEditorDomForSave as runRichDehydrateEditorDomForSave,
  findTaskCheckboxOnDirectListItem,
  normalizeRichTaskListDom,
  stripRichStrayParagraphCloseTagTextNodes,
  unwrapRedundantRichFontSpansInHolder,
  unwrapRichParagraphsWrappingDirectLists
} from "./src/rich-dehydrate-for-save";
import { pickYoriInnerStorageFromDehydratedClone } from "./src/rich-plain-serialize-for-storage";
import {
  buildRichTableGrid,
  expandRichInnerHtmlSelectionToCellTags,
  findOriginCellAtOrAfter,
  getOriginCellByGridPosition,
  orderRichTableCellsReadingOrder
} from "./src/rich-table-grid";
import {
  focusRichTableCell,
  getAdjacentRichTableCell,
  getRichTableCellFromSelection,
  isRichSelectionInsideTableCell,
  restoreCaretAfterRichTaskListInTableCells
} from "./src/rich-table-selection-dom";
import { computeRichTableCellsForBulkTextStyle } from "./src/rich-table-bulk-text-style";
import {
  getCurrentRichTableCellFromEditor,
  getDraggedRichTableCellsFromAnchors,
  getRichTableCellsForBulkStyleFromAnchor,
  getSelectedRichTableCells as bulkPickRichTableCellsForTable,
  sortRichTableCellsDocumentOrder,
  tryGetRichTableCellsFromDragRectangle as bulkPickRichTableCellsFromDragRectangle
} from "./src/rich-table-bulk-selection";
import {
  getClosestRichTableCellFromTarget,
  richPointerTargetElement
} from "./src/rich-table-pointer-dom";
import {
  clearNativeSelectionInRichEditor,
  clearRichTableSelectionVisual,
  refreshRichTableSelectionVisual
} from "./src/rich-table-selection-visual";
import {
  composeNoteWithFrontmatterAndRichBlock,
  getYoriRichInnerContentStartInBody,
  splitLeadingYamlFrontmatter,
  splitNoteAroundRichBlock
} from "./src/yori-note-rich-block";
import { yoriRichInnerLoadAsRawHtml } from "./src/yori-rich-inner-load";
import { openRichTagInsertModal, type RichTagInsertHost } from "./src/rich-tag-insert-modal";
import {
  colorPickModalStrings,
  pickColorModalStrings,
  richAlignStepLabel,
  richAlignToolbarStrings,
  richBodyMenuStrings,
  richBorderWidthPresetLabel,
  richInsertTableTemplateHtml,
  richLineSpacingToolbarStrings,
  richNoticeStrings,
  richParagraphBorderSplitStrings,
  richTableMenuStrings,
  toolbarColorSplitStrings,
  toolbarCommandLabel,
  toolbarFontInheritLabel,
  type YoriUiLang
} from "./src/yori-locale";

export default class YoriEditorPlugin extends Plugin {
  settings: YoriEditorSettings;
  private toolbarEl: HTMLElement | null = null;
  private toolbarLayoutObserver: ResizeObserver | null = null;
  private richEditorWrapEl: HTMLElement | null = null;
  private richEditorEl: HTMLDivElement | null = null;
  private richTableContextMenuEl: HTMLElement | null = null;
  private richContextCell: HTMLTableCellElement | null = null;
  /** 右键「插入笔记标签」弹窗打开前保存的光标，用于关闭后插入 #标签 */
  private richTagInsertSavedRange: Range | null = null;
  /** 「插入库内链接」弹窗打开前保存的选区/光标，避免失焦后插入落到文末 */
  private richVaultLinkSavedRange: Range | null = null;
  /** 右键菜单弹出瞬间的选区（点击菜单项时选区常被清空，仅供「插入内部链接」消费一次） */
  private richVaultLinkContextRange: Range | null = null;
  /** `[[…]]` 水合成 `<a>` 后：待把光标放到锚点之后的 inner（与 data-yori-wikilink 一致） */
  private richPendingCaretAfterVaultWikiRawInner: string | null = null;
  private richSelectionSyncTimer: number | null = null;
  private richDragAnchorCell: HTMLTableCellElement | null = null;
  private richDragFocusCell: HTMLTableCellElement | null = null;
  private richIsTableDragging = false;
  /** 最后一次在编辑器表格拖选时的指针位置（用于 mouseup 落在释放格但未触发该格 mousemove 时同步 focus）。 */
  private richLastTableDragClientX = 0;
  private richLastTableDragClientY = 0;
  private richResizeMode: "col" | "row" | null = null;
  private richResizeCell: HTMLTableCellElement | null = null;
  private richResizeStartX = 0;
  private richResizeStartY = 0;
  private richResizeStartSize = 0;
  private richResizeColIndex = -1;
  private richResizeNeighborColIndex = -1;
  private richResizeNeighborStartSize = 0;
  private richResizeTableStartWidth = 0;
  private richAlignCycleBtnEl: HTMLButtonElement | null = null;
  private richLineSpacingPanelEl: HTMLElement | null = null;
  private richLineSpacingMainBtnEl: HTMLButtonElement | null = null;
  private richBorderPanelEl: HTMLElement | null = null;
  /** 工具栏「文字颜色」主按钮下的色条（随 mountToolbar 重建） */
  private textColorIndicatorEl: HTMLElement | null = null;
  /** 工具栏「高亮」主按钮下的色条 */
  private highlightColorIndicatorEl: HTMLElement | null = null;
  /** 工具栏字体/字号下拉框内展示的当前文案（随光标或选区刷新） */
  private fontFamilyToolbarLabelEl: HTMLElement | null = null;
  private fontSizeToolbarLabelEl: HTMLElement | null = null;
  /** 字体/字号预设列表面板（用于刷新 √ 选中态） */
  private fontFamilyPresetPanelEl: HTMLElement | null = null;
  private fontSizePresetPanelEl: HTMLElement | null = null;
  /** 原生 CodeMirror 更新选区/文档后与字体工具栏标签同步（selectionchange 不一定触发） */
  private markdownFontToolbarSyncRaf = 0;
  /** 工具栏「附件」：隐藏的多选文件控件，卸载时移除 */
  private attachmentFileInputEl: HTMLInputElement | null = null;
  private richAlignCurrentIndex = 0;
  private richAutoSaveTimer: number | null = null;
  private richSaveInProgress = false;
  private richSaveQueued = false;
  private richSaveWatchdogTimer: number | null = null;
  private richSaveRunId = 0;
  private readonly richSaveTimeoutMs = 4000;
  private richLastSavedAt: number | null = null;
  private richLastSaveCostMs: number | null = null;
  private richIsDirty = false;
  private richHostView: MarkdownView | null = null;
  private richHostFilePath: string | null = null;
  private readonly richBlockStart = "<!-- YORI_RICH_START -->";
  private readonly richBlockEnd = "<!-- YORI_RICH_END -->";
  /** 切换工具栏模式等时候选，强制刷新源码里对边界注释行的隐藏装饰 */
  private richBoundaryDecoGeneration = 0;
  /** 高级编辑区：含表格直接改 style 等不会进入浏览器 execCommand 撤销栈的修改，用语义化 HTML 快照撤销 */
  private richUndoHtmlStack: string[] = [];
  private richRedoHtmlStack: string[] = [];
  private richSuppressRichUndoCapture = false;
  private readonly richUndoHtmlMaxDepth = 200;
  /** beforeinput 推断的下一次 input 是否为删除类操作（用于把光标托出仅余边框为末块时的误吸选区）。 */
  private richInputNextIsDelete = false;
  /** 最近一次 loadRichEditorFromNote 从源码解析的 checkbox 勾选序（补水合后再写回，避免 DOM 与磁盘不一致） */
  private richCheckboxFlagsFromLastNoteLoad: boolean[] | null = null;
  /** 已为表格复选框桥接挂载监听器的 post-processor 根节点（防重复） */
  private readonly nativeMarkedCheckboxBridgeHosts = new WeakSet<HTMLElement>();
  /** 工作区全局 pointer 桥接（Live Preview 内事件常被截断，用坐标命中 input） */
  private workspaceMarkedCbPointerBound = false;
  /**
   * LP 勾选写回会更新缓冲区并可能立刻再派发 change/input；不设锁时易形成递归或巨量同步栈，表现为卡顿/闪退。
   */
  private nativePreviewCheckboxWriteLock = false;
  /** 元数据 resolve/resolved 后合并触发富文本内链 hydration */
  private richMetadataHydrateTimer: number | null = null;
  /** 阅读/编辑切换后合并同步子视图（同一 leaf 内切模式不会触发 active-leaf-change） */
  private richMarkdownModeSyncTimer: number | null = null;
  /** 从预览回到源码编辑后的延迟刷新 */
  private richReadingResumeTimer: number | null = null;
  private richLastMarkdownMode: MarkdownViewModeType | null = null;
  /** 图片右下角缩放：会话与 document 级监听清理 */
  private richImageResizeSession: { img: HTMLImageElement; startX: number; startW: number } | null = null;
  private richImageResizeMoveHandler: ((e: MouseEvent) => void) | null = null;
  private richImageResizeUpHandler: ((e: MouseEvent) => void) | null = null;
  /** 从高级编辑区拖起媒体块时记录来源，drop 时整段移动并保留 ![[…|宽]] 等属性，避免默认复制+无宽度插入 */
  private richInternalDragMediaParagraph: HTMLElement | null = null;
  /** 高级编辑内 HTML5 drag 结束（可能在 img 等元素上结束，未必触发编辑器 mouseup）：统一清光标与表格拖选态 */
  private readonly richGlobalDragEndCapture = (evt: Event): void => {
    const e = evt as DragEvent;
    const t = e.target;
    if (!(t instanceof Node) || !this.richEditorWrapEl?.contains(t)) return;
    this.finishRichHtmlDragCleanup(e.clientX, e.clientY);
  };

  /** 清除 Chromium / Electron 在 HTML5 drag 后遗留的 grabbing 光标 */
  private resetRichDragCursorUI(clientX?: number, clientY?: number): void {
    const sweep = (): void => {
      document.documentElement.style.removeProperty("cursor");
      document.body.style.removeProperty("cursor");
      this.richEditorEl?.style.removeProperty("cursor");
      this.richEditorWrapEl?.style.removeProperty("cursor");
      try {
        (this.app.workspace.containerEl as HTMLElement | null)?.style?.removeProperty("cursor");
      } catch {
        /* ignore */
      }
    };
    sweep();
    if (
      typeof clientX === "number" &&
      typeof clientY === "number" &&
      Number.isFinite(clientX) &&
      Number.isFinite(clientY)
    ) {
      try {
        document.elementFromPoint(clientX, clientY)?.dispatchEvent(
          new MouseEvent("mousemove", { bubbles: true, clientX, clientY, view: window })
        );
      } catch {
        /* ignore */
      }
    }
    window.requestAnimationFrame(sweep);
    window.setTimeout(sweep, 0);
    window.setTimeout(sweep, 80);
  }

  private finishRichHtmlDragCleanup(clientX?: number, clientY?: number): void {
    this.richInternalDragMediaParagraph = null;
    this.resetRichDragCursorUI(clientX, clientY);
    this.clearRichTableDragSelection();
    if (this.richResizeMode) {
      this.richResizeMode = null;
      this.richResizeCell = null;
      this.richResizeColIndex = -1;
      this.richResizeNeighborColIndex = -1;
      this.richResizeNeighborStartSize = 0;
      this.richResizeTableStartWidth = 0;
    }
    this.richEditorEl?.removeClass("is-table-resizing");
    this.richEditorEl?.removeClass("is-cell-drag-selecting");
  }

  /** 工作区布局变化后补 hydration（与「切换窗格/窗口重新激活」后发生活水合同步） */
  private richLayoutHydrateTimer: number | null = null;
  /** 用户输入后补 hydration（按回车会触发 input→自动保存→metadata 再解析，肉眼像「一回车就变链接」；此处直接随输入补水合） */
  private richInputHydrateTimer: number | null = null;
  /** mountRichEditor 时用于 flex 布局与高度裁剪的 .view-content */
  private richMountContainerEl: HTMLElement | null = null;
  private richWrapResizeObserver: ResizeObserver | null = null;

  private uiLang(): YoriUiLang {
    return this.settings.pluginUiLanguage === "en" ? "en" : "zh";
  }

  refreshToolbarForUiLanguage(): void {
    this.mountToolbar();
  }

  async onload(): Promise<void> {
    await this.loadSettings();
    this.addSettingTab(new YoriEditorSettingTab(this.app, this));
    this.registerCommands();
    this.registerEditorExtensionStyles();
    this.registerEditorExtension(createRichBoundaryMarkerHideExtension(this as unknown as YoriCmChromeHost));
    this.registerEditorExtension(createMarkdownToolbarFontSyncExtension(this as unknown as YoriCmChromeHost));
    this.registerEditorExtension(this.nativeMarkedCheckboxLivePreviewExtension());
    this.registerEditorExtension(
      createNativeMarkdownVaultDropPasteExtension(this as unknown as NativeMarkdownVaultDropPasteCmHost)
    );
    this.registerEvent(this.app.workspace.on("active-leaf-change", () => this.mountToolbar()));
    this.registerEvent(
      this.app.metadataCache.on("resolve", (file) => {
        if (this.settings.toolbarMode !== "rich" || !this.richEditorEl) return;
        const host = this.getRichHostFile();
        if (host && file.path === host.path) {
          this.scheduleHydrateRichWikilinksAfterMetadata();
        }
      })
    );
    this.registerEvent(
      this.app.metadataCache.on("resolved", () => this.scheduleHydrateRichWikilinksAfterMetadata())
    );
    this.registerEvent(
      this.app.workspace.on("layout-change", () => {
        this.scheduleHydrateRichWikilinksAfterLayout();
        this.queueRichMarkdownModeSync();
      })
    );
    this.registerEvent(
      this.app.workspace.on("resize", () => {
        this.queueRichMarkdownModeSync();
      })
    );
    this.registerDomEvent(window, "focus", () => {
      if (this.settings.toolbarMode !== "rich" || !this.richEditorEl) return;
      this.scheduleHydrateRichWikilinksAfterMetadata();
    });
    this.registerDomEvent(document, "selectionchange", () => {
      const sel = window.getSelection();
      if (this.richEditorEl && sel?.anchorNode && this.richEditorEl.contains(sel.anchorNode)) {
        this.syncRichLineSpacingToolbarState();
      }
      if (this.richEditorEl) {
        this.scheduleRichSelectionVisualSync();
      }
      this.refreshFontToolbarLabelsIfMounted();
    });
    this.registerInterval(window.setInterval(() => this.refreshFontToolbarLabelsIfMounted(), 350));
    this.registerDomEvent(
      document,
      "pointerdown",
      (evt: PointerEvent) => this.closeRichTableContextMenuIfOutsidePointer(evt),
      { capture: true }
    );
    this.registerDomEvent(document, "keydown", (evt) => this.handleGlobalKeydown(evt), { capture: true });
    const onNativeMarkedCheckboxCommit = (evt: Event): void => {
      this.handleNativeMarkedTableCheckboxFromEvent(evt);
    };
    /* change/input 在勾选已提交后同步触发；勿用 rAF（切到源码会拆掉预览 DOM，晚点再写会 isConnected 失败或读到旧缓冲）。 */
    this.registerDomEvent(document, "change", onNativeMarkedCheckboxCommit, { capture: true });
    this.registerDomEvent(document, "input", onNativeMarkedCheckboxCommit, { capture: true });
    this.registerDomEvent(window, "change", onNativeMarkedCheckboxCommit, { capture: true });
    this.registerDomEvent(window, "input", onNativeMarkedCheckboxCommit, { capture: true });
    this.registerEvent(
      this.app.workspace.on("layout-change", () => this.ensureWorkspaceMarkedCheckboxPointerBridge())
    );
    this.ensureWorkspaceMarkedCheckboxPointerBridge();
    this.mountToolbar();
  }

  /** 收起工具栏上所有 `.is-open` 下拉（字体/字号、颜色、行间距、段落边框等），若有任一被收起则返回 true */
  private closeAllToolbarFlyoutsIfOpen(): boolean {
    const bar = this.toolbarEl;
    if (!bar?.isConnected) return false;
    const nodes = bar.querySelectorAll(".is-open");
    if (nodes.length === 0) return false;
    nodes.forEach((node) => node.removeClass("is-open"));
    return true;
  }

  private handleGlobalKeydown(evt: KeyboardEvent): void {
    if (evt.key === "Escape") {
      const ctxMenu = this.richTableContextMenuEl;
      if (ctxMenu?.isConnected) {
        const openSubs = ctxMenu.querySelectorAll(".yori-rich-table-context-submenu.is-open");
        if (openSubs.length > 0) {
          openSubs.forEach((el) => el.removeClass("is-open"));
          evt.preventDefault();
          evt.stopPropagation();
          evt.stopImmediatePropagation();
          return;
        }
        this.closeRichTableContextMenu();
        evt.preventDefault();
        evt.stopPropagation();
        evt.stopImmediatePropagation();
        return;
      }

      if (this.closeAllToolbarFlyoutsIfOpen()) {
        evt.preventDefault();
        evt.stopPropagation();
        evt.stopImmediatePropagation();
        return;
      }
    }

    if (this.settings.toolbarMode !== "rich" || !this.richEditorEl) return;

    const ae = document.activeElement;
    const focusInRich =
      !!ae && (ae === this.richEditorEl || (ae instanceof Node && this.richEditorEl.contains(ae)));

    const activeView = this.getActiveMarkdownView();
    if (
      this.richHostView &&
      activeView === this.richHostView &&
      !evt.isComposing &&
      (evt.key === "s" || evt.key === "S") &&
      (evt.ctrlKey || evt.metaKey) &&
      !evt.altKey &&
      !evt.shiftKey
    ) {
      evt.preventDefault();
      evt.stopPropagation();
      evt.stopImmediatePropagation();
      void this.persistRichEditor()
        .then(() => {
          new Notice("已保存");
        })
        .catch(() => {
          new Notice("保存失败");
        });
      return;
    }

    const cell =
      getRichTableCellFromSelection(this.richEditorEl) ??
      (this.richDragAnchorCell && this.richEditorEl.contains(this.richDragAnchorCell)
        ? this.richDragAnchorCell
        : null);
    const caretInTableCell = !!cell && this.richEditorEl.contains(cell) && focusInRich;

    if (caretInTableCell && evt.key === "Tab") {
      const c = cell as HTMLTableCellElement;
      const next = evt.shiftKey ? getAdjacentRichTableCell(c, "prev") : getAdjacentRichTableCell(c, "next");
      if (next) {
        evt.preventDefault();
        evt.stopPropagation();
        evt.stopImmediatePropagation();
        focusRichTableCell(this.richEditorEl, next, evt.shiftKey ? "end" : "start");
        this.scheduleRichSelectionVisualSync();
        return;
      }
      if (!evt.shiftKey) {
        const tableBefore = c.closest("table");
        const rowCountBefore = tableBefore?.rows.length ?? 0;
        this.addRichTableRow(c);
        const tableAfter = c.closest("table");
        if (tableAfter && tableAfter.rows.length > rowCountBefore) {
          evt.preventDefault();
          evt.stopPropagation();
          evt.stopImmediatePropagation();
          const newRow = tableAfter.rows[tableAfter.rows.length - 1];
          const first = newRow.cells[0] as HTMLTableCellElement | undefined;
          if (first) {
            focusRichTableCell(this.richEditorEl, first, "start");
            this.scheduleRichSelectionVisualSync();
          }
          return;
        }
      }
      return;
    }

    if (caretInTableCell && (evt.ctrlKey || evt.metaKey) && evt.key.toLowerCase() === "a" && !evt.altKey) {
      evt.preventDefault();
      evt.stopPropagation();
      evt.stopImmediatePropagation();
      const range = document.createRange();
      range.selectNodeContents(cell as HTMLTableCellElement);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      this.scheduleRichSelectionVisualSync();
      return;
    }

    /* 根上 Ctrl/Cmd+A：浏览器在含 contenteditable=false 的媒体块时，全选常漏掉最前附件 */
    if (
      focusInRich &&
      !caretInTableCell &&
      !evt.isComposing &&
      (evt.ctrlKey || evt.metaKey) &&
      evt.key.toLowerCase() === "a" &&
      !evt.altKey &&
      !evt.shiftKey
    ) {
      evt.preventDefault();
      evt.stopPropagation();
      evt.stopImmediatePropagation();
      const range = document.createRange();
      range.selectNodeContents(this.richEditorEl);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      this.richEditorEl.focus({ preventScroll: true });
      this.scheduleRichSelectionVisualSync();
      return;
    }

    if (
      caretInTableCell &&
      !evt.isComposing &&
      (evt.key === "Backspace" || evt.key === "Delete") &&
      !evt.ctrlKey &&
      !evt.metaKey &&
      !evt.altKey
    ) {
      const table = (cell as HTMLTableCellElement).closest("table") as HTMLTableElement | null;
      if (table && this.richEditorEl.contains(table)) {
        const selected = this.getSelectedRichTableCells(table);
        if (selected.length > 1) {
          evt.preventDefault();
          evt.stopPropagation();
          evt.stopImmediatePropagation();
          this.rememberRichStateForUndo();
          for (const c of selected) {
            c.innerHTML = "<br>";
          }
          this.applyRichTableColumnTypes(table);
          this.markRichDirty();
          this.scheduleRichAutoSave();
          this.clearRichTableDragSelection();
          const model = buildRichTableGrid(table);
          const sorted = [...selected].sort((a, b) => {
            const pa = model.origins.get(a);
            const pb = model.origins.get(b);
            if (!pa || !pb) return 0;
            return pa.row - pb.row || pa.col - pb.col;
          });
          const focusTarget = sorted[0] ?? selected[0];
          if (focusTarget) focusRichTableCell(this.richEditorEl, focusTarget, "start");
          this.scheduleRichSelectionVisualSync();
          return;
        }
      }
    }

    if (!focusInRich) return;

    if (
      !evt.isComposing &&
      (evt.key === "Backspace" || evt.key === "Delete") &&
      !evt.ctrlKey &&
      !evt.metaKey &&
      !evt.altKey &&
      this.isSelectionCoveringRichEditor()
    ) {
      evt.preventDefault();
      evt.stopPropagation();
      evt.stopImmediatePropagation();
      this.clearRichEditorAllContent();
      return;
    }

    const key = evt.key.toLowerCase();
    const mod = evt.ctrlKey || evt.metaKey;
    if (mod && !evt.altKey && key === "z" && !evt.shiftKey) {
      evt.preventDefault();
      evt.stopPropagation();
      evt.stopImmediatePropagation();
      this.richEditorEl.focus();
      this.undoRichEditor();
      return;
    }
    const redoChordY = evt.ctrlKey && !evt.metaKey && !evt.altKey && !evt.shiftKey && key === "y";
    const redoChordShiftZ = mod && !evt.altKey && evt.shiftKey && key === "z";
    if (redoChordY || redoChordShiftZ) {
      evt.preventDefault();
      evt.stopPropagation();
      evt.stopImmediatePropagation();
      this.richEditorEl.focus();
      this.redoRichEditor();
    }
  }

  private resetRichUndoStacks(): void {
    this.richUndoHtmlStack.length = 0;
    this.richRedoHtmlStack.length = 0;
  }

  private getRichEditorHtmlForUndoSnapshot(): string {
    if (!this.richEditorEl) return "";
    return getRichEditorInnerHtmlForUndoSnapshot(this.richEditorEl);
  }

  private rememberRichStateForUndo(force = false): void {
    if (!this.richEditorEl || this.richSuppressRichUndoCapture) return;
    const html = this.getRichEditorHtmlForUndoSnapshot();
    const last = this.richUndoHtmlStack[this.richUndoHtmlStack.length - 1];
    if (!force && last === html) return;
    this.richUndoHtmlStack.push(html);
    if (this.richUndoHtmlStack.length > this.richUndoHtmlMaxDepth) {
      this.richUndoHtmlStack.splice(0, this.richUndoHtmlStack.length - this.richUndoHtmlMaxDepth);
    }
    this.richRedoHtmlStack.length = 0;
  }

  private undoRichEditor(): void {
    if (!this.richEditorEl) return;
    if (this.richUndoHtmlStack.length > 0) {
      this.richSuppressRichUndoCapture = true;
      try {
        const prev = this.richUndoHtmlStack.pop()!;
        this.richRedoHtmlStack.push(this.getRichEditorHtmlForUndoSnapshot());
        this.richEditorEl.innerHTML = prev;
      } finally {
        this.richSuppressRichUndoCapture = false;
      }
      applyRichCheckboxCheckedStateFromAttributesAfterLoad(this.richEditorEl);
      this.normalizeAllRichTables();
      this.markRichDirty();
      this.scheduleRichAutoSave();
      this.scheduleRichSelectionVisualSync();
      return;
    }
    document.execCommand("undo");
    this.markRichDirty();
    this.scheduleRichAutoSave();
    this.scheduleRichSelectionVisualSync();
  }

  private redoRichEditor(): void {
    if (!this.richEditorEl) return;
    if (this.richRedoHtmlStack.length > 0) {
      this.richSuppressRichUndoCapture = true;
      try {
        const next = this.richRedoHtmlStack.pop()!;
        this.richUndoHtmlStack.push(this.getRichEditorHtmlForUndoSnapshot());
        this.richEditorEl.innerHTML = next;
      } finally {
        this.richSuppressRichUndoCapture = false;
      }
      applyRichCheckboxCheckedStateFromAttributesAfterLoad(this.richEditorEl);
      this.normalizeAllRichTables();
      this.markRichDirty();
      this.scheduleRichAutoSave();
      this.scheduleRichSelectionVisualSync();
      return;
    }
    document.execCommand("redo");
    this.markRichDirty();
    this.scheduleRichAutoSave();
    this.scheduleRichSelectionVisualSync();
  }

  /** 拖选矩形对应的单元格列表；无有效矩形时返回 null */
  private tryGetRichTableCellsFromDragRectangle(): HTMLTableCellElement[] | null {
    return bulkPickRichTableCellsFromDragRectangle(
      this.richEditorEl,
      this.richDragAnchorCell,
      this.richDragFocusCell,
      (tbl) => this.getSelectedRichTableCells(tbl)
    );
  }

  /** 列类型切换后强制让笔记窗格与高级编辑区拿回焦点并重建选区（单次调用） */
  private restoreRichEditorFocusInTableCell(cell: HTMLTableCellElement): void {
    if (!this.richEditorEl || !cell.isConnected || !this.richEditorEl.contains(cell)) return;
    const view = this.richHostView;
    const leaf = view?.leaf;
    // 不要用 setActiveLeaf(..., { focus: true })，否则会按默认行为聚焦隐藏的 CodeMirror，高级编辑区永远抢不到光标
    if (leaf && this.app.workspace.activeLeaf !== leaf) {
      try {
        this.app.workspace.setActiveLeaf(leaf, { focus: false });
      } catch {
        /* ignore */
      }
    }

    const applyCaret = (): void => {
      if (!this.richEditorEl || !cell.isConnected || !this.richEditorEl.contains(cell)) return;
      if (view) {
        blurMarkdownSourceEditor(view);
      }
      this.richEditorEl.focus({ preventScroll: true });
      const sel = window.getSelection();
      if (!sel) return;
      try {
        const range = document.createRange();
        if (cell.childNodes.length === 0) {
          cell.appendChild(document.createElement("br"));
        }
        range.selectNodeContents(cell);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      } catch {
        try {
          focusRichTableCell(this.richEditorEl, cell, "end");
        } catch {
          /* ignore */
        }
      }
      const ae = document.activeElement;
      if (ae instanceof HTMLInputElement && ae.type === "checkbox" && this.richEditorEl.contains(ae)) {
        ae.blur();
        if (view) {
          blurMarkdownSourceEditor(view);
        }
        this.richEditorEl.focus({ preventScroll: true });
        const sel2 = window.getSelection();
        if (!sel2) return;
        try {
          const range = document.createRange();
          range.selectNodeContents(cell);
          range.collapse(false);
          sel2.removeAllRanges();
          sel2.addRange(range);
        } catch {
          /* ignore */
        }
      }
    };

    applyCaret();
    queueMicrotask(applyCaret);
    this.scheduleRichSelectionVisualSync();
  }

  /** 右键菜单关闭后 Obsidian 可能再次改焦点，双 rAF + 多次延时重试 */
  private scheduleRestoreRichEditorFocusInTableCell(cell: HTMLTableCellElement): void {
    const run = (): void => this.restoreRichEditorFocusInTableCell(cell);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        run();
        window.setTimeout(run, 0);
        window.setTimeout(run, 100);
        window.setTimeout(run, 260);
        window.setTimeout(run, 520);
      });
    });
  }

  private registerCommands(): void {
    registerYoriCommands(this as unknown as YoriEditorCommandsSelf);
  }

  private registerEditorExtensionStyles(): void {
    this.registerMarkdownPostProcessor(
      (el, ctx) => {
        el.querySelectorAll("li.task-list-item").forEach((item) => {
          const checkbox = item.querySelector("input[type='checkbox']") as HTMLInputElement | null;
          if (!checkbox) return;
          const textEl = item.querySelector(".task-list-item-checkbox")?.nextSibling;
          if (checkbox.checked && textEl instanceof HTMLElement) {
            textEl.classList.add("yori-editor-tag-done");
          }
        });
        const pathHint = ctx.sourcePath || this.resolveHydrationSourcePath();
        hydratePreviewImageEmbeds(el, pathHint, this.embedHydrateHost());
        this.attachYoriNativeMarkedCheckboxBridge(el, ctx);
      },
      100
    );
  }

  /** @see src/native-marked-checkbox-bridge.ts */
  private attachYoriNativeMarkedCheckboxBridge(el: HTMLElement, ctx: MarkdownPostProcessorContext): void {
    installNativeMarkedCheckboxBridge(this as unknown as NativeMarkedCheckboxBridgeHost, el, ctx);
  }

  /** Live Preview 块内 checkbox：在 CodeMirror 根 domEventHandlers 捕获 change/input（补 document/后处理链路的死角）。 */
  private nativeMarkedCheckboxLivePreviewExtension(): Extension {
    return createNativeMarkedCheckboxLivePreviewExtension(this as unknown as NativeMarkedCheckboxBridgeHost);
  }

  /**
   * Live Preview 下点击 target 偶被 Shadow/宿主重定向，document 级 change 捕不到；
   * 在 workspace 根上 capture pointerup，用坐标补命中表格内 checkbox，再走与 post-processor 相同的写回。
   * @see src/native-marked-checkbox-bridge.ts createWorkspaceMarkedCheckboxPointerHandler
   */
  private ensureWorkspaceMarkedCheckboxPointerBridge(): void {
    if (this.workspaceMarkedCbPointerBound) return;
    const root = this.app.workspace.containerEl;
    if (!root) return;
    this.workspaceMarkedCbPointerBound = true;
    this.registerDomEvent(
      root,
      "pointerup",
      createWorkspaceMarkedCheckboxPointerHandler(this as unknown as NativeMarkedCheckboxBridgeHost),
      { capture: true }
    );
  }

  private bumpRichBoundaryDecorations(): void {
    bumpRichBoundaryDecorationsWorkspace(this.app, this as unknown as Pick<YoriCmChromeHost, "richBoundaryDecoGeneration">);
  }

  private mountToolbar(): void {
    this.toolbarLayoutObserver?.disconnect();
    this.toolbarLayoutObserver = null;
    this.toolbarEl?.remove();
    this.toolbarEl = null;
    this.richAlignCycleBtnEl = null;
    this.richLineSpacingPanelEl = null;
    this.richLineSpacingMainBtnEl = null;
    this.richBorderPanelEl = null;
    this.textColorIndicatorEl = null;
    this.highlightColorIndicatorEl = null;
    this.fontFamilyToolbarLabelEl = null;
    this.fontSizeToolbarLabelEl = null;
    this.fontFamilyPresetPanelEl = null;
    this.fontSizePresetPanelEl = null;
    const view = this.getActiveMarkdownView();
    if (!view) return;
    const container = view.containerEl.querySelector(".view-content");
    if (!container) return;

    const toolbar = createDiv({
      cls: "yori-editor-toolbar is-top"
    });
    const isRichMode = this.settings.toolbarMode === "rich";
    const lang = this.uiLang();
    const actions = (isRichMode ? RICH_TOOLBAR_ACTIONS : MARKDOWN_TOOLBAR_ACTIONS).map((a) => ({
      ...a,
      label: toolbarCommandLabel(lang, a.command)
    }));
    const grouped = new Map<string, ToolbarAction[]>();
    actions.forEach((action) => {
      if (!grouped.has(action.group)) grouped.set(action.group, []);
      grouped.get(action.group)?.push(action);
    });

    grouped.forEach((actions, group) => {
      const groupEl = toolbar.createDiv({ cls: `yori-toolbar-group is-${group}` });
      actions.forEach((action) => {
        if (action.command === "font-family" || action.command === "rich-font-family") {
          this.createFontSelectControl(groupEl, isRichMode, "family");
          return;
        }
        if (action.command === "font-size" || action.command === "rich-font-size") {
          this.createFontSelectControl(groupEl, isRichMode, "size");
          return;
        }
        if (action.command === "highlight" || action.command === "rich-highlight") {
          this.createHighlightSplitButton(groupEl, isRichMode);
          return;
        }
        if (action.command === "text-color" || action.command === "rich-text-color") {
          this.createTextColorSplitButton(groupEl, isRichMode);
          return;
        }
        if (isRichMode && action.command === "rich-line-spacing") {
          this.createRichLineSpacingSplitButton(groupEl);
          return;
        }
        if (isRichMode && action.command === "rich-align-cycle") {
          this.createRichAlignCycleButton(groupEl);
          return;
        }
        if (isRichMode && action.command === "rich-paragraph-border") {
          this.createRichBorderSplitButton(groupEl);
          return;
        }
        if (isRichMode && action.command === "rich-insert-table") {
          this.createRichTableSplitButton(groupEl);
          return;
        }
        if (!isRichMode && action.command === "checkbox") {
          const taskBtn = groupEl.createEl("button", {
            attr: {
              "aria-label": action.label,
              title: action.label
            }
          });
          setIcon(taskBtn, action.icon);
          taskBtn.addEventListener("mousedown", (evt) => {
            evt.preventDefault();
          });
          taskBtn.addEventListener("click", () => this.applyMarkdownTaskListFromUser(undefined));
          return;
        }
        const btn = groupEl.createEl("button", {
          attr: {
            "aria-label": action.label,
            title: action.label
          }
        });
        const inlineFmt = inlineFormatKindFromCommand(action.command);
        if (inlineFmt) {
          btn.addClass("yori-inline-format-toggle");
          btn.dataset.yoriInlineFormat = inlineFmt;
        }
        setIcon(btn, action.icon);
        // 防止按钮夺走编辑器焦点，导致选区高亮消失。
        btn.addEventListener("mousedown", (evt) => {
          evt.preventDefault();
        });
        btn.addEventListener("click", () =>
          this.executeObsidianCommandById(`${this.manifest.id}:${action.command}`)
        );
      });
    });

    container.prepend(toolbar);
    this.toolbarEl = toolbar;
    this.attachToolbarLayoutObserver(toolbar);
    if (isRichMode) {
      this.mountRichEditor(view, container);
    } else {
      this.unmountRichEditor();
    }
    this.refreshFontToolbarLabelsIfMounted();
  }

  /** flex 换行后，新行首组与上一行行首对齐（避免 ::before 负偏移贴边）。 */
  private attachToolbarLayoutObserver(toolbar: HTMLElement): void {
    this.toolbarLayoutObserver?.disconnect();
    const run = () => this.syncToolbarWrappedGroupInsets();
    try {
      this.toolbarLayoutObserver = new ResizeObserver(() => run());
      this.toolbarLayoutObserver.observe(toolbar);
    } catch {
      this.toolbarLayoutObserver = null;
    }
    requestAnimationFrame(() => run());
  }

  private syncToolbarWrappedGroupInsets(): void {
    const bar = this.toolbarEl;
    if (!bar?.isConnected) return;
    const groups = Array.from(bar.querySelectorAll<HTMLElement>(".yori-toolbar-group"));
    if (groups.length < 2) return;
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      if (i === 0) {
        g.classList.remove("yori-toolbar-wrap-line-start");
        continue;
      }
      const prev = groups[i - 1];
      g.classList.toggle("yori-toolbar-wrap-line-start", g.offsetTop > prev.offsetTop);
    }
  }

  private getActiveMarkdownView(): MarkdownView | null {
    return this.app.workspace.getActiveViewOfType(MarkdownView);
  }

  private getActiveEditor(): Editor | null {
    return this.getActiveMarkdownView()?.editor ?? null;
  }

  private getMarkdownViewForEditor(editor: Editor): MarkdownView | null {
    let found: MarkdownView | null = null;
    this.app.workspace.iterateAllLeaves((leaf) => {
      const v = leaf.view;
      if (v instanceof MarkdownView && v.editor === editor) found = v;
    });
    return found;
  }

  /** 由 CodeMirror EditorView 反查所属 Obsidian Editor（分屏拖放时用）。 */
  private resolveEditorFromCmView(cmView: EditorView): Editor | null {
    let found: Editor | null = null;
    this.app.workspace.iterateAllLeaves((leaf) => {
      const v = leaf.view;
      if (v instanceof MarkdownView) {
        const cm = (v.editor as unknown as { cm?: EditorView }).cm;
        if (cm === cmView) found = v.editor;
      }
    });
    return found;
  }

  private handleNativeSourcePasteBareUrl(evt: ClipboardEvent, view: EditorView): boolean {
    if (this.settings.toolbarMode === "rich") return false;
    const cd = evt.clipboardData;
    if (!cd) return false;
    const text = cd.getData("text/plain");
    if (!isBareHttpUrlPaste(text)) return false;
    const editor = this.resolveEditorFromCmView(view);
    if (!editor) return false;
    evt.preventDefault();
    editor.replaceSelection(markdownInlineLinkFromBareUrl(text));
    return true;
  }

  private findMarkdownLeafShowingFile(file: TFile): WorkspaceLeaf | null {
    let found: WorkspaceLeaf | null = null;
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (found) return;
      const view = leaf.view;
      if (view instanceof MarkdownView && view.file?.path === file.path) found = leaf;
    });
    return found;
  }

  /**
   * 高级编辑内点击水合后的库内链接：按设置打开（⌘/Ctrl+点击仍强制新开标签，与 Obsidian 习惯一致）。
   */
  private async openVaultLinkPerClickPreference(
    linktext: string,
    sourcePath: string,
    modifiersForceNewLeaf: boolean
  ): Promise<void> {
    if (modifiersForceNewLeaf) {
      await this.app.workspace.openLinkText(linktext, sourcePath, true);
      return;
    }
    const mode = this.settings.vaultLinkClickOpenMode;
    if (mode === "new-tab") {
      await this.app.workspace.openLinkText(linktext, sourcePath, "tab");
      return;
    }
    if (mode === "current-tab") {
      await this.app.workspace.openLinkText(linktext, sourcePath, false);
      return;
    }
    const dest = this.resolveVaultLinkDestForHydrate(linktext, sourcePath);
    if (dest instanceof TFile) {
      const leaf = this.findMarkdownLeafShowingFile(dest);
      if (leaf) {
        await leaf.loadIfDeferred();
        this.app.workspace.setActiveLeaf(leaf, { focus: true });
        return;
      }
    }
    await this.app.workspace.openLinkText(linktext, sourcePath, "tab");
  }

  private applyNativeVaultIngestedDrop(
    evt: DragEvent,
    view: EditorView,
    ingested: { uniqVaultFiles: TFile[]; externalFiles: File[] },
    sourcePath: string
  ): void {
    const editor = this.resolveEditorFromCmView(view);
    if (!editor) return;
    const cmPos = view.posAtCoords({ x: evt.clientX, y: evt.clientY });
    const offset = cmPos ?? editor.posToOffset(editor.getCursor());
    const edPos = editor.offsetToPos(offset);
    const mdForVault = (tf: TFile): string => markdownLinkForDroppedVaultFile(this.app, tf, sourcePath);
    const finish = (md: string): void => {
      insertMarkdownAtEditorPosition(editor, edPos, md);
      editor.focus();
    };
    if (ingested.externalFiles.length === 0) {
      if (ingested.uniqVaultFiles.length === 0) return;
      finish(ingested.uniqVaultFiles.map(mdForVault).join("\n\n"));
      return;
    }
    void (async (): Promise<void> => {
      try {
        const chunks: string[] = ingested.uniqVaultFiles.map(mdForVault);
        for (const file of ingested.externalFiles) {
          chunks.push(mdForVault(await copyFileIntoVaultAsAttachment(this.app, file, sourcePath)));
        }
        if (chunks.length === 0) return;
        finish(chunks.join("\n\n"));
      } catch (e) {
        console.error(e);
        new Notice("导入附件失败，请检查库权限与附件路径设置。");
      }
    })();
  }

  private async finishNativeSourceVaultDropWithAsyncStrings(
    evt: DragEvent,
    view: EditorView,
    dt: DataTransfer,
    sourcePath: string
  ): Promise<void> {
    const stringPayloads = await pullDataTransferStringItemsAsync(dt);
    const snap = snapshotRichDataTransferSync(dt);
    const payloads = { ...snap.payloads };
    for (const [k, v] of Object.entries(stringPayloads)) {
      if (!v) continue;
      payloads[k] = payloads[k] ? `${payloads[k]}\n${v}` : v;
    }
    const ingested = this.ingestVaultLinkPiecesFromSnapshot({ files: snap.files, payloads }, sourcePath);
    if (!ingested) return;
    this.applyNativeVaultIngestedDrop(evt, view, ingested, sourcePath);
  }

  private handleNativeSourceVaultDrop(evt: DragEvent, view: EditorView): boolean {
    if (this.settings.toolbarMode === "rich") return false;
    const editor = this.resolveEditorFromCmView(view);
    if (!editor) return false;
    const mv = this.getMarkdownViewForEditor(editor);
    const sourcePath = mv?.file?.path ?? "";
    if (!sourcePath) return false;
    const dt = evt.dataTransfer;
    if (!dt) return false;

    let ingested = this.ingestDataTransferVaultLinkPieces(dt, sourcePath);
    if (!ingested) {
      const items = Array.from(dt.items ?? []);
      const retryAsync =
        items.some((it) => it.kind === "string") ||
        items.some((it) => it.kind === "file") ||
        (dt.files?.length ?? 0) > 0;
      if (!retryAsync) return false;
      evt.preventDefault();
      evt.stopPropagation();
      void this.finishNativeSourceVaultDropWithAsyncStrings(evt, view, dt, sourcePath);
      return true;
    }

    evt.preventDefault();
    evt.stopPropagation();
    this.applyNativeVaultIngestedDrop(evt, view, ingested, sourcePath);
    return true;
  }

  private openVaultLinkPicker(mode: "rich" | "markdown", editor: Editor | null | undefined): void {
    if (mode === "rich" && !this.richVaultLinkSavedRange) {
      this.captureRichCaretForVaultLinkInsert();
    }
    openVaultLinkPickerModal(this as unknown as VaultLinkPickerHost, mode, editor, this.uiLang());
  }

  /** VaultLinkPickerHost：插入用 Markdown 链接片段（与拖放逻辑共用）。 */
  markdownLinkForRichDroppedVaultFile(dest: TFile, sourcePath: string): string {
    return markdownLinkForDroppedVaultFile(this.app, dest, sourcePath);
  }

  private handleRichEditorPasteBareUrl(evt: ClipboardEvent): void {
    if (this.settings.toolbarMode !== "rich" || !this.richEditorEl) return;
    const text = evt.clipboardData?.getData("text/plain") ?? "";
    if (!isBareHttpUrlPaste(text)) return;
    evt.preventDefault();
    this.runRichInsertHtml(richExternalLinkHtmlFromUrl(text));
  }

  /** 树序收集 Live Preview 内任务列表复选框（ul.contains-task-list + li.task-list-item），含 Shadow。 */
  private collectNativePreviewTaskListCheckboxesDeep(container: HTMLElement): HTMLInputElement[] {
    const acc: HTMLInputElement[] = [];
    const visit = (root: ParentNode): void => {
      for (const inp of Array.from(root.querySelectorAll("input[type='checkbox'],input[type=\"checkbox\"]"))) {
        if (!(inp instanceof HTMLInputElement) || inp.type !== "checkbox") continue;
        if (this.isNativePreviewTaskListCheckbox(inp)) acc.push(inp);
      }
      root.querySelectorAll("*").forEach((el) => {
        if (el instanceof Element && el.shadowRoot) visit(el.shadowRoot);
      });
    };
    visit(container);
    return acc;
  }

  /** DOMParser 得到的 YORI inner 根下任务列表 input（树序，与 collectNativePreviewTaskListCheckboxesDeep 一致）。 */
  private collectTaskListCheckboxInputsFromParsedInnerRoot(root: ParentNode): HTMLInputElement[] {
    const acc: HTMLInputElement[] = [];
    for (const inp of Array.from(root.querySelectorAll("input[type='checkbox'],input[type=\"checkbox\"]"))) {
      if (!(inp instanceof HTMLInputElement) || inp.type !== "checkbox") continue;
      const li = inp.closest("li");
      if (!li?.classList.contains("task-list-item")) continue;
      const ul = li.parentElement;
      if (!(ul instanceof HTMLUListElement) || !ul.classList.contains("contains-task-list")) continue;
      acc.push(inp);
    }
    return acc;
  }

  private isNativePreviewTaskListCheckbox(input: HTMLInputElement): boolean {
    const li = input.closest("li");
    if (!li?.classList.contains("task-list-item")) return false;
    const ul = li.parentElement;
    return ul instanceof HTMLUListElement && ul.classList.contains("contains-task-list");
  }

  /** 包含该节点的 Markdown 视图（用于 LP/预览里点选控件时定位所属笔记）。 */
  private getMarkdownViewContaining(node: Node): MarkdownView | null {
    let found: MarkdownView | null = null;
    this.app.workspace.iterateAllLeaves((leaf) => {
      const v = leaf.view;
      if (v instanceof MarkdownView && containerContainsNodeShadowAware(v.containerEl, node))
        found = v;
    });
    return found;
  }

  private getMarkdownViewBySourcePath(sourcePath: string): MarkdownView | null {
    const norm = normalizePath(sourcePath);
    let found: MarkdownView | null = null;
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (found) return;
      const v = leaf.view;
      if (v instanceof MarkdownView && v.file && normalizePath(v.file.path) === norm) {
        found = v;
      }
    });
    return found;
  }

  /**
   * Live Preview 若在 Shadow DOM 内渲染，evt.target 可能被重定向到宿主，需从 composedPath 取真实 input。
   */
  private resolveNativeMarkedCheckboxFromEvent(evt: Event): HTMLInputElement | null {
    const t = evt.target;
    if (t instanceof HTMLInputElement && t.type === "checkbox") return t;
    for (const item of evt.composedPath()) {
      if (item instanceof HTMLInputElement && item.type === "checkbox") return item;
    }
    return null;
  }

  /** 与 getMarkdownViewContaining 相同思路，但对路径上每一节点尝试 contains（兼容 Shadow 内节点）。 */
  private getMarkdownViewFromComposedPath(path: EventTarget[]): MarkdownView | null {
    let found: MarkdownView | null = null;
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (found) return;
      const v = leaf.view;
      if (!(v instanceof MarkdownView)) return;
      for (const item of path) {
        if (!(item instanceof Node)) continue;
        if (containerContainsNodeShadowAware(v.containerEl, item)) {
          found = v;
          return;
        }
      }
    });
    return found;
  }

  /**
   * Live Preview 可能把控件放在 ShadowRoot 内，closest("td") 无法跨根；沿 parentNode / shadow host 上升查找单元格。
   */
  private resolveTableCellForCheckbox(input: HTMLInputElement): HTMLTableCellElement | null {
    const seen = new Set<Node>();
    let cur: Node | null = input;
    while (cur && seen.size < 48) {
      if (seen.has(cur)) break;
      seen.add(cur);
      if (cur instanceof HTMLTableCellElement) return cur;
      const parentNode: Node | null = cur.parentNode;
      if (parentNode) {
        cur = parentNode;
        continue;
      }
      const r = cur.getRootNode();
      if (r instanceof ShadowRoot) {
        cur = r.host;
        continue;
      }
      break;
    }
    return null;
  }

  private resolveTableForCheckbox(input: HTMLInputElement): HTMLTableElement | null {
    const cell = this.resolveTableCellForCheckbox(input);
    return cell?.closest("table") ?? null;
  }

  /**
   * Live Preview / 阅读预览中勾选标记列表格时，Obsidian 不会把 &lt;input checked&gt; 写回缓冲区；
   * 在 change / input 时立即同步（同一事件回合内），避免切到源码后预览卸载导致丢写回。
   * 预览里 th 上的 data-yori-col-type 可能被净化掉，不在此依赖；改以磁盘 inner 校验标记列。
   */
  private handleNativeMarkedTableCheckboxFromEvent(evt: Event, sourcePathHint?: string): void {
    const input = this.resolveNativeMarkedCheckboxFromEvent(evt);
    if (!input) return;
    this.handleNativeMarkedTableCheckboxFromInput(input, sourcePathHint, evt);
  }

  /** 无 Event 时使用（例如 click 后 microtask）；优先 sourcePathHint 解析视图。 */
  private handleNativeMarkedTableCheckboxFromInput(
    input: HTMLInputElement,
    sourcePathHint?: string,
    evt?: Event
  ): void {
    if (this.settings.toolbarMode === "rich") return;
    if (input.type !== "checkbox") return;

    let view: MarkdownView | null = null;
    if (sourcePathHint) {
      view = this.getMarkdownViewBySourcePath(sourcePathHint);
    }
    if (!view) {
      view = this.getMarkdownViewContaining(input);
    }
    if (!view && evt) {
      view = this.getMarkdownViewFromComposedPath(evt.composedPath());
    }
    if (!view?.file) {
      const active = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (
        active?.file &&
        (!sourcePathHint || normalizePath(active.file.path) === normalizePath(sourcePathHint))
      ) {
        view = active;
      }
    }
    if (!view?.file) return;

    if (this.isNativePreviewTaskListCheckbox(input)) {
      if (this.richEditorEl && containerContainsNodeShadowAware(this.richEditorEl, input)) return;
      this.syncNativeTaskListCheckboxToSource(view, input, input.checked);
      return;
    }

    const cell = this.resolveTableCellForCheckbox(input);
    if (!cell) return;
    const table = cell.closest("table");
    if (!table) return;

    if (this.richEditorEl && containerContainsNodeShadowAware(this.richEditorEl, table)) return;

    const model = buildRichTableGrid(table);
    const pos = model.origins.get(cell as HTMLTableCellElement);
    if (!pos) return;
    if (pos.row < 1) return;

    const checked = input.checked;
    if (this.syncNativeMarkedTableCheckboxToSource(view, table, pos.row, pos.col, checked)) return;
  }

  private syncNativeMarkedTableCheckboxToSource(
    view: MarkdownView,
    liveTable: HTMLTableElement,
    row: number,
    col: number,
    checked: boolean
  ): boolean {
    const file = view.file;
    if (!file) return false;

    const fullText = readMarkdownViewText(view);
    const { frontmatter, body } = splitLeadingYamlFrontmatter(fullText);
    const { prefix, inner, suffix } = splitNoteAroundRichBlock(this.richBlockStart, this.richBlockEnd, body);
    if (inner === null) return false;

    const viewTables = collectHtmlTablesDeep(view.containerEl).filter(
      (t) => !this.richEditorEl || !containerContainsNodeShadowAware(this.richEditorEl, t)
    );
    const tableIndex = viewTables.indexOf(liveTable);

    const doc = new DOMParser().parseFromString(
      `<div id="yori-native-marked-cb-sync">${inner}</div>`,
      "text/html"
    );
    const root = doc.getElementById("yori-native-marked-cb-sync");
    if (!root || root.querySelector("parsererror")) return false;

    const sourceTables = Array.from(root.querySelectorAll("table"));
    const srcTable = this.pickYoriSourceTableForNativeSync(liveTable, sourceTables, tableIndex);
    if (!srcTable) return false;

    const srcCell = getOriginCellByGridPosition(srcTable, row, col);
    if (!srcCell) return false;
    const srcHeader = getOriginCellByGridPosition(srcTable, 0, col);
    if (!srcHeader) return false;
    const colType = (srcHeader.getAttribute("data-yori-col-type") || srcHeader.dataset.yoriColType || "")
      .trim()
      .toLowerCase();
    if (colType !== "marked") return false;

    if (this.nativePreviewCheckboxWriteLock) return false;
    this.nativePreviewCheckboxWriteLock = true;
    try {
      const checkbox = srcCell.querySelector("input[type='checkbox']") as HTMLInputElement | null;
      if (checkbox) {
        checkbox.checked = checked;
        if (checked) checkbox.setAttribute("checked", "");
        else checkbox.removeAttribute("checked");
      } else {
        srcCell.innerHTML = `<input type='checkbox' ${checked ? "checked " : ""}/><br>`;
      }

      const nextInner = root.innerHTML;
      const nextBody = `${prefix}${this.richBlockStart}\n${nextInner}\n${this.richBlockEnd}${suffix}`;

      const nextFull =
        !frontmatter ? nextBody : `${frontmatter}${frontmatter.endsWith("\n") ? "" : "\n"}${nextBody}`;
      writeMarkdownViewText(view, nextFull);
      void this.app.vault.modify(file, nextFull).catch(() => {
        /* 忽略只读/占用等，编辑器内已由 writeMarkdownViewText 更新 */
      });
      return true;
    } finally {
      this.nativePreviewCheckboxWriteLock = false;
    }
  }

  private syncNativeTaskListCheckboxToSource(view: MarkdownView, liveInput: HTMLInputElement, checked: boolean): void {
    const file = view.file;
    if (!file) return;
    if (this.nativePreviewCheckboxWriteLock) return;
    if (this.richEditorEl && containerContainsNodeShadowAware(this.richEditorEl, liveInput)) return;

    const fullText = readMarkdownViewText(view);
    const { frontmatter, body } = splitLeadingYamlFrontmatter(fullText);
    const { prefix, inner, suffix } = splitNoteAroundRichBlock(this.richBlockStart, this.richBlockEnd, body);
    if (inner === null) return;

    const liveList = this.collectNativePreviewTaskListCheckboxesDeep(view.containerEl).filter(
      (inp) => !this.richEditorEl || !containerContainsNodeShadowAware(this.richEditorEl, inp)
    );
    const idx = liveList.indexOf(liveInput);
    if (idx < 0) return;

    const doc = new DOMParser().parseFromString(
      `<div id="yori-native-task-cb-sync">${inner}</div>`,
      "text/html"
    );
    const root = doc.getElementById("yori-native-task-cb-sync");
    if (!root || root.querySelector("parsererror")) return;

    const srcList = this.collectTaskListCheckboxInputsFromParsedInnerRoot(root);
    if (idx >= srcList.length) return;
    const srcCb = srcList[idx];
    if (!srcCb) return;

    this.nativePreviewCheckboxWriteLock = true;
    try {
      srcCb.checked = checked;
      if (checked) srcCb.setAttribute("checked", "");
      else srcCb.removeAttribute("checked");

      const nextInner = root.innerHTML;
      const nextBody = `${prefix}${this.richBlockStart}\n${nextInner}\n${this.richBlockEnd}${suffix}`;
      const nextFull =
        !frontmatter ? nextBody : `${frontmatter}${frontmatter.endsWith("\n") ? "" : "\n"}${nextBody}`;
      writeMarkdownViewText(view, nextFull);
      void this.app.vault.modify(file, nextFull).catch(() => {
        /* 忽略只读/占用等 */
      });
    } finally {
      this.nativePreviewCheckboxWriteLock = false;
    }
  }

  /**
   * 预览 `querySelectorAll("table")` 含块外 Markdown 表等时，下标与 YORI inner 内表不一一对应；
   * 优先用「带标记列 + 同行列数」对齐源码中的表。
   */
  private pickYoriSourceTableForNativeSync(
    liveTable: HTMLTableElement,
    sourceTables: HTMLTableElement[],
    preferredIndex: number
  ): HTMLTableElement | null {
    const liveModel = buildRichTableGrid(liveTable);
    const liveRowCount = liveTable.rows.length;
    const liveColCount = liveModel.grid[0]?.length ?? 0;
    /** 首行可能是 th 或 td（新增行/粘贴/规范化后常见为 td）；与 getOriginCellByGridPosition(..., 0, col) 一致。 */
    const hasMarked = (t: HTMLTableElement): boolean => {
      const r0 = t.rows[0];
      if (!r0) return false;
      return Array.from(r0.cells).some((cell) => {
        const v = (cell.getAttribute("data-yori-col-type") || cell.dataset.yoriColType || "")
          .trim()
          .toLowerCase();
        return v === "marked";
      });
    };
    const dimsMatch = (t: HTMLTableElement): boolean => {
      const m = buildRichTableGrid(t);
      return t.rows.length === liveRowCount && (m.grid[0]?.length ?? 0) === liveColCount;
    };

    const preferred = preferredIndex >= 0 ? sourceTables[preferredIndex] : undefined;
    if (preferred && hasMarked(preferred) && dimsMatch(preferred)) return preferred;

    const candidates = sourceTables.filter((t) => hasMarked(t) && dimsMatch(t));
    if (candidates.length === 1) return candidates[0] ?? null;
    if (candidates.length > 1 && preferred && candidates.includes(preferred)) return preferred;

    const markedOnly = sourceTables.filter(hasMarked);
    if (markedOnly.length === 1) return markedOnly[0] ?? null;

    return candidates[0] ?? markedOnly[0] ?? null;
  }

  private rememberLastTextColor(hex: string): void {
    const v = hex.trim();
    if (!v) return;
    this.settings.lastTextColor = v;
    void this.saveData(this.settings);
    if (this.textColorIndicatorEl) this.textColorIndicatorEl.style.backgroundColor = v;
  }

  private rememberLastHighlightColor(hex: string): void {
    const v = hex.trim();
    if (!v) return;
    this.settings.lastHighlightColor = v;
    void this.saveData(this.settings);
    if (this.highlightColorIndicatorEl) this.highlightColorIndicatorEl.style.backgroundColor = v;
  }

  private rememberLastFontFamily(value: string): void {
    this.settings.lastFontFamily = (value || "").trim();
    void this.saveData(this.settings);
  }

  private rememberLastFontSize(value: string): void {
    this.settings.lastFontSize = (value || "").trim();
    void this.saveData(this.settings);
  }

  private createHighlightSplitButton(container: HTMLElement, richMode: boolean): void {
    const lang = this.uiLang();
    const cs = toolbarColorSplitStrings(lang);
    const wrap = container.createDiv({ cls: "yori-split-btn-wrap yori-split-color" });
    const lastHi = this.settings.lastHighlightColor;
    const mainBtn = wrap.createEl("button", {
      cls: "yori-split-main yori-split-color-main",
      attr: {
        "aria-label": cs.highlightMain(lastHi),
        title: cs.highlightMain(lastHi)
      }
    });
    const hiIconSlot = mainBtn.createSpan({ cls: "yori-split-color-main-icon" });
    setIcon(hiIconSlot, "highlighter");
    const hiBar = mainBtn.createSpan({ cls: "yori-split-color-main-bar" });
    hiBar.style.backgroundColor = lastHi;
    this.highlightColorIndicatorEl = hiBar;

    const arrowBtn = wrap.createEl("button", {
      cls: "yori-split-arrow",
      attr: { "aria-label": cs.highlightArrowLabel, title: cs.highlightArrowLabel }
    });
    setIcon(arrowBtn, "chevron-down");

    const panel = wrap.createDiv({ cls: "yori-highlight-panel" });
    if (!richMode) {
      const swatchGrid = panel.createDiv({ cls: "yori-native-color-swatch-grid" });
      HIGHLIGHT_COLORS.forEach((color) => {
        const swatch = swatchGrid.createEl("button", {
          cls: "yori-highlight-swatch",
          attr: {
            "aria-label": cs.highlightSwatchAria(color),
            title: color
          }
        });
        swatch.style.backgroundColor = color;
        swatch.addEventListener("mousedown", (evt) => evt.preventDefault());
        swatch.addEventListener("click", () => {
          const editor = this.getActiveEditor();
          if (!editor) return;
          this.applyHighlightColor(editor, color);
          panel.removeClass("is-open");
        });
      });
      const clearBtn = panel.createEl("button", {
        cls: "yori-highlight-clear",
        text: cs.clearHighlight
      });
      clearBtn.addEventListener("mousedown", (evt) => evt.preventDefault());
      clearBtn.addEventListener("click", () => {
        const editor = this.getActiveEditor();
        if (!editor) return;
        this.clearHighlight(editor);
        panel.removeClass("is-open");
      });
    }

    mainBtn.addEventListener("mousedown", (evt) => evt.preventDefault());
    mainBtn.addEventListener("click", () => {
      if (richMode) {
        this.applyRichHighlightColor(this.settings.lastHighlightColor);
      } else {
        const editor = this.getActiveEditor();
        if (!editor) return;
        this.applyHighlightColor(editor, this.settings.lastHighlightColor);
      }
    });

    arrowBtn.addEventListener("mousedown", (evt) => evt.preventDefault());
    arrowBtn.addEventListener("click", (evt) => {
      evt.stopPropagation();
      const nextOpen = !panel.hasClass("is-open");
      if (richMode && nextOpen) {
        this.fillRichToolbarColorPanel(panel, this.getRichToolbarSelectionColor("hilite"), {
          onPick: (hex) => this.applyRichHighlightColor(hex),
          onClear: () => this.clearRichHighlight(),
          onCustom: () => {
            void this.applyRichHighlightColorCustom();
          },
          onClosePanel: () => panel.removeClass("is-open")
        });
      }
      panel.toggleClass("is-open", nextOpen);
    });

    document.addEventListener(
      "click",
      (evt) => {
        if (!wrap.contains(evt.target as Node)) {
          panel.removeClass("is-open");
        }
      },
      true
    );
  }

  private createTextColorSplitButton(container: HTMLElement, richMode: boolean): void {
    const lang = this.uiLang();
    const cs = toolbarColorSplitStrings(lang);
    const wrap = container.createDiv({ cls: "yori-split-btn-wrap yori-split-color" });
    const lastTx = this.settings.lastTextColor;
    const mainBtn = wrap.createEl("button", {
      cls: "yori-split-main yori-split-color-main",
      attr: {
        "aria-label": cs.textMain(lastTx),
        title: cs.textMain(lastTx)
      }
    });
    const txIconSlot = mainBtn.createSpan({ cls: "yori-split-color-main-icon" });
    setIcon(txIconSlot, "type");
    const txBar = mainBtn.createSpan({ cls: "yori-split-color-main-bar" });
    txBar.style.backgroundColor = lastTx;
    this.textColorIndicatorEl = txBar;

    const arrowBtn = wrap.createEl("button", {
      cls: "yori-split-arrow",
      attr: { "aria-label": cs.textArrowLabel, title: cs.textArrowLabel }
    });
    setIcon(arrowBtn, "chevron-down");

    const panel = wrap.createDiv({ cls: "yori-text-color-panel" });
    if (!richMode) {
      const swatchGrid = panel.createDiv({ cls: "yori-native-color-swatch-grid" });
      HIGHLIGHT_COLORS.forEach((color) => {
        const swatch = swatchGrid.createEl("button", {
          cls: "yori-text-swatch",
          attr: {
            "aria-label": cs.textSwatchAria(color),
            title: color
          }
        });
        swatch.style.backgroundColor = color;
        swatch.addEventListener("mousedown", (evt) => evt.preventDefault());
        swatch.addEventListener("click", () => {
          const editor = this.getActiveEditor();
          if (!editor) return;
          this.applyTextColor(editor, color);
          panel.removeClass("is-open");
        });
      });

      const clearBtn = panel.createEl("button", {
        cls: "yori-text-clear",
        text: cs.clearTextColor
      });
      clearBtn.addEventListener("mousedown", (evt) => evt.preventDefault());
      clearBtn.addEventListener("click", () => {
        const editor = this.getActiveEditor();
        if (!editor) return;
        this.clearTextColor(editor);
        panel.removeClass("is-open");
      });
    }

    mainBtn.addEventListener("mousedown", (evt) => evt.preventDefault());
    mainBtn.addEventListener("click", () => {
      if (richMode) {
        this.applyRichTextColor(this.settings.lastTextColor);
      } else {
        const editor = this.getActiveEditor();
        if (!editor) return;
        this.applyTextColor(editor, this.settings.lastTextColor);
      }
    });

    arrowBtn.addEventListener("mousedown", (evt) => evt.preventDefault());
    arrowBtn.addEventListener("click", (evt) => {
      evt.stopPropagation();
      const nextOpen = !panel.hasClass("is-open");
      if (richMode && nextOpen) {
        this.fillRichToolbarColorPanel(panel, this.getRichToolbarSelectionColor("fore"), {
          onPick: (hex) => this.applyRichTextColor(hex),
          onClear: () => this.clearRichTextColor(),
          onCustom: () => {
            void this.applyRichTextColorCustom();
          },
          onClosePanel: () => panel.removeClass("is-open")
        });
      }
      panel.toggleClass("is-open", nextOpen);
    });

    document.addEventListener(
      "click",
      (evt) => {
        if (!wrap.contains(evt.target as Node)) {
          panel.removeClass("is-open");
        }
      },
      true
    );
  }

  private createFontSelectControl(container: HTMLElement, richMode: boolean, kind: "family" | "size"): void {
    const presets = kind === "family" ? FONT_FAMILY_PRESETS : FONT_SIZE_PRESETS;
    const panelCls = kind === "family" ? "yori-font-family-panel" : "yori-font-size-panel";

    const lang = this.uiLang();
    const fontCmd = richMode ? "rich-font-family" : "font-family";
    const sizeCmd = richMode ? "rich-font-size" : "font-size";
    const wrap = container.createDiv({ cls: "yori-font-toolbar-wrap" });
    const mainBtn = wrap.createEl("button", {
      cls: `yori-font-select${kind === "size" ? " is-size" : ""}`,
      attr: {
        type: "button",
        "aria-label": kind === "family" ? toolbarCommandLabel(lang, fontCmd) : toolbarCommandLabel(lang, sizeCmd),
        title: kind === "family" ? toolbarCommandLabel(lang, fontCmd) : toolbarCommandLabel(lang, sizeCmd)
      }
    });
    const labelEl = mainBtn.createSpan({ cls: "yori-font-select-label", text: toolbarFontInheritLabel(lang) });
    if (kind === "family") this.fontFamilyToolbarLabelEl = labelEl;
    else this.fontSizeToolbarLabelEl = labelEl;
    const chevron = mainBtn.createSpan({ cls: "yori-font-select-chevron" });
    setIcon(chevron, "chevron-down");

    const panel = wrap.createDiv({ cls: panelCls });
    if (kind === "family") this.fontFamilyPresetPanelEl = panel;
    else this.fontSizePresetPanelEl = panel;

    presets.forEach((p, idx) => {
      const btn = panel.createEl("button", {
        cls: "yori-font-preset-option",
        attr: {
          type: "button",
          ...(kind === "family"
            ? { "data-yori-font-fam-idx": String(idx) }
            : { "data-yori-font-size-idx": String(idx) })
        }
      });
      btn.createSpan({ cls: "yori-font-preset-check", text: "✓" });
      btn.createSpan({ cls: "yori-font-preset-label", text: p.label });
      btn.addEventListener("mousedown", (evt) => evt.preventDefault());
      btn.addEventListener("click", () => {
        if (richMode) {
          if (kind === "family") this.applyRichFontFamily(p.value);
          else this.applyRichFontSize(p.value);
        } else {
          const editor = this.getActiveEditor();
          if (!editor) return;
          if (kind === "family") this.applyFontFamilyMarkdown(editor, p.value);
          else this.applyFontSizeMarkdown(editor, p.value);
        }
        this.refreshFontToolbarLabelsIfMounted();
        panel.removeClass("is-open");
      });
    });

    mainBtn.addEventListener("mousedown", (evt) => evt.preventDefault());
    mainBtn.addEventListener("click", (evt) => {
      evt.stopPropagation();
      const next = !panel.hasClass("is-open");
      panel.toggleClass("is-open", next);
      if (next) this.refreshFontPresetPanelActiveStates();
    });

    document.addEventListener(
      "click",
      (evt) => {
        if (!wrap.contains(evt.target as Node)) {
          panel.removeClass("is-open");
        }
      },
      true
    );
  }

  private refreshFontToolbarLabelsIfMounted(): void {
    this.refreshInlineFormatToolbarState();
    if (!this.fontFamilyToolbarLabelEl && !this.fontSizeToolbarLabelEl) return;
    const richMode = this.settings.toolbarMode === "rich";
    let familyText = toolbarFontInheritLabel(this.uiLang());
    let sizeText = toolbarFontInheritLabel(this.uiLang());
    if (richMode && this.richEditorEl) {
      const ctx = this.getRichFontDisplayFromRichEditor();
      familyText = ctx.family;
      sizeText = ctx.size;
    } else if (!richMode) {
      const editor = this.getActiveEditor();
      if (editor) {
        const text = editor.getValue();
        const c = editor.getCursor("head");
        const off = editor.posToOffset(c);
        const ctx = this.getMarkdownFontContextAtOffset(text, off);
        familyText = this.formatFontFamilyForToolbar(ctx.fontFamily);
        sizeText = this.formatFontSizeForToolbar(ctx.fontSize);
      }
    }
    if (this.fontFamilyToolbarLabelEl) this.fontFamilyToolbarLabelEl.textContent = familyText;
    if (this.fontSizeToolbarLabelEl) this.fontSizeToolbarLabelEl.textContent = sizeText;
    this.refreshFontPresetPanelActiveStates();
  }

  /** 内联格式（粗/斜/划/下）工具栏按钮的选中态，与选区/Caret 同步。 */
  private refreshInlineFormatToolbarState(): void {
    if (!this.toolbarEl) return;
    const toggles = this.toolbarEl.querySelectorAll<HTMLElement>(".yori-inline-format-toggle");
    if (!toggles.length) return;
    const flags = this.getInlineFormatFlagsForToolbar();
    for (const el of Array.from(toggles)) {
      const k = el.dataset.yoriInlineFormat as InlineFormatKind | undefined;
      if (!k) continue;
      el.classList.toggle("yori-inline-format-active", flags[k]);
    }
  }

  private getInlineFormatFlagsForToolbar(): Record<InlineFormatKind, boolean> {
    const empty: Record<InlineFormatKind, boolean> = {
      bold: false,
      italic: false,
      underline: false,
      strikeThrough: false
    };
    const richMode = this.settings.toolbarMode === "rich";
    if (richMode && this.richEditorEl) {
      return {
        bold: this.richSelectionIndicatesFormat("bold"),
        italic: this.richSelectionIndicatesFormat("italic"),
        underline: this.richSelectionIndicatesFormat("underline"),
        strikeThrough: this.richSelectionIndicatesFormat("strikeThrough")
      };
    }
    const editor = this.getActiveEditor();
    if (!editor) return empty;
    return this.getMarkdownInlineFormatFlags(editor);
  }

  private richSelectionIndicatesFormat(kind: InlineFormatKind): boolean {
    if (!this.richEditorEl) return false;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    const a = sel.anchorNode;
    const f = sel.focusNode;
    if (!a || !f || !this.richEditorEl.contains(a) || !this.richEditorEl.contains(f)) return false;
    if (sel.isCollapsed) return this.richNodeIndicatesFormat(sel.anchorNode, kind);
    return (
      this.richNodeIndicatesFormat(sel.anchorNode, kind) &&
      this.richNodeIndicatesFormat(sel.focusNode, kind)
    );
  }

  private richNodeIndicatesFormat(node: Node | null, kind: InlineFormatKind): boolean {
    if (!node || !this.richEditorEl) return false;
    let el: HTMLElement | null = node.nodeType === Node.TEXT_NODE ? node.parentElement : null;
    if (!el && node instanceof HTMLElement) el = node;
    if (!el) return false;
    while (el && this.richEditorEl.contains(el)) {
      const tag = el.tagName;
      if (kind === "bold") {
        if (tag === "B" || tag === "STRONG") return true;
        const fw = el.style.fontWeight;
        if (fw === "bold" || fw === "bolder") return true;
        if (fw !== "" && !Number.isNaN(parseInt(fw, 10)) && parseInt(fw, 10) >= 600) return true;
      }
      if (kind === "italic") {
        if (tag === "I" || tag === "EM") return true;
        if (el.style.fontStyle === "italic") return true;
      }
      if (kind === "underline") {
        if (tag === "U") return true;
        const td = (el.style.textDecorationLine || el.style.textDecoration || "").toLowerCase();
        if (td.includes("underline")) return true;
      }
      if (kind === "strikeThrough") {
        if (tag === "S" || tag === "STRIKE" || tag === "DEL") return true;
        const td = (el.style.textDecorationLine || el.style.textDecoration || "").toLowerCase();
        if (td.includes("line-through")) return true;
      }
      el = el.parentElement;
    }
    return false;
  }

  private getMarkdownInlineFormatFlags(editor: Editor): Record<InlineFormatKind, boolean> {
    const text = editor.getValue();
    const from = editor.getCursor("from");
    const to = editor.getCursor("to");
    const a = editor.posToOffset(from);
    const b = editor.posToOffset(to);
    const at = (off: number) => ({
      bold: this.markdownOffsetInDoubleDelim(text, off, "**") || this.markdownOffsetInDoubleDelim(text, off, "__"),
      italic: this.markdownOffsetHasItalic(text, off),
      underline: this.markdownOffsetInHtmlTag(text, off, "u"),
      strikeThrough: this.markdownOffsetInDoubleDelim(text, off, "~~")
    });
    if (a === b) {
      const one = at(a);
      return { bold: one.bold, italic: one.italic, underline: one.underline, strikeThrough: one.strikeThrough };
    }
    const ca = at(a);
    const cb = at(b);
    return {
      bold: ca.bold && cb.bold,
      italic: ca.italic && cb.italic,
      underline: ca.underline && cb.underline,
      strikeThrough: ca.strikeThrough && cb.strikeThrough
    };
  }

  /** `**..**` / `__..__` / `~~..~~`：取成对分隔符，假定开闭交替出现。 */
  private markdownOffsetInDoubleDelim(text: string, off: number, delim: "**" | "__" | "~~"): boolean {
    let i = 0;
    let open = -1;
    const len = delim.length;
    while (i <= text.length - len) {
      if (text.slice(i, i + len) === delim) {
        if (open < 0) open = i + len;
        else {
          if (off >= open && off < i) return true;
          open = -1;
        }
        i += len;
      } else {
        i++;
      }
    }
    return false;
  }

  private markdownOffsetHasItalic(text: string, off: number): boolean {
    if (this.markdownOffsetNearBold(text, off)) return false;
    return this.markdownOffsetInSingleDelimItalic(text, off, "*") || this.markdownOffsetInSingleDelimItalic(text, off, "_");
  }

  /** 光标是否在 `**`/ `__` 粗体区域内（含边界上分隔符外侧视为否）。 */
  private markdownOffsetNearBold(text: string, off: number): boolean {
    return this.markdownOffsetInDoubleDelim(text, off, "**") || this.markdownOffsetInDoubleDelim(text, off, "__");
  }

  /** 单反斜体：跳过 `**` / `__`，按单字符开闭交替。 */
  private markdownOffsetInSingleDelimItalic(text: string, off: number, ch: "*" | "_"): boolean {
    let i = 0;
    let open = -1;
    while (i < text.length) {
      if (ch === "*" && text.startsWith("**", i)) {
        i += 2;
        continue;
      }
      if (ch === "_" && text.startsWith("__", i)) {
        i += 2;
        continue;
      }
      if (text[i] === ch) {
        if (open < 0) open = i + 1;
        else {
          if (off >= open && off < i) return true;
          open = -1;
        }
      }
      i++;
    }
    return false;
  }

  private markdownOffsetInHtmlTag(text: string, off: number, tagLc: string): boolean {
    const openRe = new RegExp(`<${tagLc}\\b[^>]*>`, "gi");
    const lower = text.toLowerCase();
    const closeNeedle = `</${tagLc}>`;
    let m: RegExpExecArray | null;
    while ((m = openRe.exec(text)) !== null) {
      const innerStart = m.index + m[0].length;
      const close = lower.indexOf(closeNeedle, innerStart);
      if (close === -1) continue;
      if (off >= innerStart && off < close) return true;
    }
    return false;
  }

  private getRawFontFamilyAtToolbarCarets(): string {
    const richMode = this.settings.toolbarMode === "rich";
    if (richMode && this.richEditorEl) {
      const sel = window.getSelection();
      let node: Node | null = sel?.anchorNode ?? null;
      if (!node || !this.richEditorEl.contains(node)) return "";
      if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
      const el = node instanceof HTMLElement ? node : null;
      if (!el || !this.richEditorEl.contains(el)) return "";
      const declared = this.getRichDeclaredFontFamilyFromElement(el);
      return declared.trim() ? declared : "";
    }
    const editor = this.getActiveEditor();
    if (!editor) return "";
    const ctx = this.getMarkdownFontContextAtOffset(
      editor.getValue(),
      editor.posToOffset(editor.getCursor("head"))
    );
    return ctx.fontFamily;
  }

  private getRawFontSizeAtToolbarCarets(): string {
    const richMode = this.settings.toolbarMode === "rich";
    if (richMode && this.richEditorEl) {
      const sel = window.getSelection();
      let node: Node | null = sel?.anchorNode ?? null;
      if (!node || !this.richEditorEl.contains(node)) return "";
      if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
      const el = node instanceof HTMLElement ? node : null;
      if (!el || !this.richEditorEl.contains(el)) return "";
      const declared = this.getRichDeclaredFontSizeFromElement(el);
      return declared.trim() ? declared : "";
    }
    const editor = this.getActiveEditor();
    if (!editor) return "";
    const ctx = this.getMarkdownFontContextAtOffset(
      editor.getValue(),
      editor.posToOffset(editor.getCursor("head"))
    );
    return ctx.fontSize;
  }

  private normalizeCssFontSizeToPresetPx(css: string): string | null {
    const v = css.trim().toLowerCase();
    if (!v || v === "inherit") return null;
    const m = /^(\d+(?:\.\d+)?)px$/.exec(v);
    if (!m) return null;
    const n = parseFloat(m[1]);
    if (!Number.isFinite(n)) return null;
    const rounded = Math.round(n * 100) / 100;
    const integral = Math.round(rounded);
    const use =
      Math.abs(rounded - integral) < 0.001 ? integral : rounded;
    return `${use}px`;
  }

  private getActiveFontFamilyPresetValue(): string | null {
    const raw = this.getRawFontFamilyAtToolbarCarets().trim();
    if (!raw || raw.toLowerCase() === "inherit") return null;
    const nv = this.normFontStackForToolbarCompare(raw);
    const exactHit = FONT_FAMILY_PRESETS.find(
      (p) => p.value && nv === this.normFontStackForToolbarCompare(p.value)
    );
    if (exactHit) return exactHit.value;
    if (nv === this.normFontStackForToolbarCompare(LEGACY_FONT_FAMILY_HEITI_STACK)) {
      return FONT_FAMILY_PRESETS.find((p) => p.label === "黑体")?.value ?? null;
    }
    const hit = FONT_FAMILY_PRESETS.find((p) =>
      this.fontPresetValueRoughlyMatchesPreset(raw, p.value)
    );
    return hit?.value ?? null;
  }

  private getActiveFontSizePresetValue(): string | null {
    const raw = this.getRawFontSizeAtToolbarCarets().trim();
    if (!raw || raw.toLowerCase() === "inherit") return null;
    const norm = this.normalizeCssFontSizeToPresetPx(raw);
    if (!norm) return null;
    const hit = FONT_SIZE_PRESETS.find((p) => p.value === norm);
    return hit?.value ?? null;
  }

  private refreshFontPresetPanelActiveStates(): void {
    const fam = this.getActiveFontFamilyPresetValue();
    this.fontFamilyPresetPanelEl
      ?.querySelectorAll<HTMLElement>("[data-yori-font-fam-idx]")
      .forEach((btn) => {
        const idx = parseInt(btn.getAttribute("data-yori-font-fam-idx") || "-1", 10);
        const p = FONT_FAMILY_PRESETS[idx];
        btn.toggleClass("is-active", p != null && fam != null && p.value === fam);
      });
    const sz = this.getActiveFontSizePresetValue();
    this.fontSizePresetPanelEl
      ?.querySelectorAll<HTMLElement>("[data-yori-font-size-idx]")
      .forEach((btn) => {
        const idx = parseInt(btn.getAttribute("data-yori-font-size-idx") || "-1", 10);
        const p = FONT_SIZE_PRESETS[idx];
        btn.toggleClass("is-active", p != null && sz != null && p.value === sz);
      });
  }

  private getMarkdownFontContextAtOffset(
    text: string,
    offset: number
  ): { fontFamily: string; fontSize: string } {
    const stack: Array<{ ff: string; fs: string }> = [];
    const re = /<span\s+style="([^"]*)">|<\/span\s*>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const end = m.index + m[0].length;
      if (end > offset) break;
      if (/^<\/span/i.test(m[0])) {
        stack.pop();
      } else {
        const st = m[1];
        const ffm = /font-family:\s*([^;]+)/i.exec(st);
        const fsm = /font-size:\s*([^;]+)/i.exec(st);
        stack.push({ ff: (ffm?.[1] ?? "").trim(), fs: (fsm?.[1] ?? "").trim() });
      }
    }
    let fontFamily = "";
    let fontSize = "";
    for (const s of stack) {
      if (s.ff) fontFamily = s.ff;
      if (s.fs) fontSize = s.fs;
    }
    return { fontFamily, fontSize };
  }

  private fontPresetValueRoughlyMatchesPreset(storedCss: string, presetValue: string): boolean {
    const norm = (s: string) =>
      s
        .toLowerCase()
        .replace(/['"]/g, "")
        .replace(/\s*,\s*/g, ",")
        .replace(/\s+/g, " ")
        .trim();
    const A = norm(storedCss);
    const B = norm(presetValue);
    if (!A || !B) return false;
    if (A === B) return true;
    const headA = A.split(",")[0] ?? A;
    const headB = B.split(",")[0] ?? B;
    /** 仅用首项匹配；勿用 includes：宋体栈以 SimSun 开头，思源宋体栈内含 SimSun 作 fallback，会被误配。 */
    return headA === headB;
  }

  /** 与 fontPresetValueRoughlyMatchesPreset 共用归一化规则，用于「声明栈」与预设整串精确相等判定。 */
  private normFontStackForToolbarCompare(s: string): string {
    return s
      .toLowerCase()
      .replace(/['"]/g, "")
      .replace(/\s*,\s*/g, ",")
      .replace(/\s+/g, " ")
      .trim();
  }

  /** 从节点向上找最近一次显式 font-family（含 &lt;font face&gt;），无则空串。 */
  private getRichDeclaredFontFamilyFromElement(el: HTMLElement): string {
    let cur: HTMLElement | null = el;
    while (cur && this.richEditorEl?.contains(cur)) {
      const sf = cur.style?.fontFamily?.trim();
      if (sf) return sf;
      if (cur.tagName === "FONT") {
        const face = (cur as HTMLFontElement).face?.trim();
        if (face) return face;
      }
      cur = cur.parentElement;
    }
    return "";
  }

  private getRichDeclaredFontSizeFromElement(el: HTMLElement): string {
    let cur: HTMLElement | null = el;
    while (cur && this.richEditorEl?.contains(cur)) {
      const sz = cur.style?.fontSize?.trim();
      if (sz) return sz;
      cur = cur.parentElement;
    }
    return "";
  }

  private parseFontFamilyCssList(css: string): string[] {
    const out: string[] = [];
    const s = css.trim();
    let i = 0;
    while (i < s.length) {
      while (i < s.length && /\s/.test(s[i]!)) i++;
      if (i >= s.length) break;
      const ch = s[i]!;
      if (ch === '"' || ch === "'") {
        i++;
        const start = i;
        while (i < s.length && s[i] !== ch) {
          if (s[i] === "\\" && i + 1 < s.length) i += 2;
          else i++;
        }
        out.push(s.slice(start, i));
        if (i < s.length) i++;
      } else {
        const start = i;
        while (i < s.length && s[i] !== ",") i++;
        out.push(s.slice(start, i).trim());
      }
      while (i < s.length && (s[i] === "," || /\s/.test(s[i]!))) i++;
    }
    return out;
  }

  /** 计算样式或指纹防护可能产生占位名，勿展示为 ?? */
  private isBogusToolbarFontName(name: string): boolean {
    const t = name.trim();
    if (!t) return true;
    if (t === "?" || t === "？" || t === "??") return true;
    if (/^[\?\uFF1F\uFFFD・·]+$/u.test(t)) return true;
    return false;
  }

  private isGenericCssFontKeyword(name: string): boolean {
    const k = name.trim().toLowerCase();
    return [
      "sans-serif",
      "serif",
      "monospace",
      "cursive",
      "fantasy",
      "system-ui",
      "ui-sans-serif",
      "ui-serif",
      "ui-monospace",
      "ui-rounded",
      "emoji",
      "math",
      "fangsong"
    ].includes(k);
  }

  private truncateToolbarLabel(str: string, maxChars: number): string {
    const arr = Array.from(str);
    if (arr.length <= maxChars) return str;
    if (maxChars <= 1) return "…";
    return `${arr.slice(0, maxChars - 1).join("")}…`;
  }

  private formatFontFamilyForToolbar(rawCss: string): string {
    const v = (rawCss || "").trim();
    if (!v || v.toLowerCase() === "inherit") return toolbarFontInheritLabel(this.uiLang());
    const nv = this.normFontStackForToolbarCompare(v);
    const exactHit = FONT_FAMILY_PRESETS.find(
      (p) => p.value && nv === this.normFontStackForToolbarCompare(p.value)
    );
    if (exactHit) return exactHit.label;
    if (nv === this.normFontStackForToolbarCompare(LEGACY_FONT_FAMILY_HEITI_STACK)) {
      return "黑体";
    }
    const hit = FONT_FAMILY_PRESETS.find(
      (p) => p.value && this.fontPresetValueRoughlyMatchesPreset(v, p.value)
    );
    if (hit) return hit.label;
    if (/yahei|jhenghei|微软雅黑/i.test(v)) return "微软雅黑";

    const names = this.parseFontFamilyCssList(v);
    const list =
      names.length > 0 ? names : v.split(",").map((x) => x.trim().replace(/^["']|["']$/g, ""));
    for (const rawName of list) {
      let name = rawName.trim().replace(/^["']|["']$/g, "").replace(/\uFFFD/g, "").trim();
      if (this.isBogusToolbarFontName(name)) continue;
      if (this.isGenericCssFontKeyword(name)) continue;
      if (/yahei|jhenghei|微软雅黑/i.test(name)) return "微软雅黑";
      const oneHit = FONT_FAMILY_PRESETS.find(
        (p) => p.value && this.fontPresetValueRoughlyMatchesPreset(name, p.value)
      );
      if (oneHit) return oneHit.label;
      return this.truncateToolbarLabel(name, 14);
    }
    return toolbarFontInheritLabel(this.uiLang());
  }

  private formatFontSizeForToolbar(rawCss: string): string {
    const v = (rawCss || "").trim();
    if (!v || v.toLowerCase() === "inherit") return toolbarFontInheritLabel(this.uiLang());
    const hit = FONT_SIZE_PRESETS.find((p) => p.value && p.value === v);
    if (hit) return hit.label;
    const px = /^(\d+(?:\.\d+)?)px$/i.exec(v);
    if (px) {
      const n = parseFloat(px[1]);
      if (Number.isFinite(n)) {
        const rounded = Math.round(n * 100) / 100;
        return Number.isInteger(rounded) ? String(rounded) : String(rounded);
      }
    }
    return v.length > 8 ? `${v.slice(0, 6)}…` : v;
  }

  private getRichFontDisplayFromRichEditor(): { family: string; size: string } {
    if (!this.richEditorEl) return { family: toolbarFontInheritLabel(this.uiLang()), size: toolbarFontInheritLabel(this.uiLang()) };
    const sel = window.getSelection();
    let node: Node | null = sel?.anchorNode ?? null;
    if (!node || !this.richEditorEl.contains(node)) {
      return { family: toolbarFontInheritLabel(this.uiLang()), size: toolbarFontInheritLabel(this.uiLang()) };
    }
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    const el = node instanceof HTMLElement ? node : null;
    if (!el || !this.richEditorEl.contains(el)) return { family: toolbarFontInheritLabel(this.uiLang()), size: toolbarFontInheritLabel(this.uiLang()) };
    const declFam = this.getRichDeclaredFontFamilyFromElement(el);
    const declSize = this.getRichDeclaredFontSizeFromElement(el);
    const familyText = declFam.trim()
      ? this.formatFontFamilyForToolbar(declFam)
      : toolbarFontInheritLabel(this.uiLang());
    const sizeText = declSize.trim()
      ? this.formatFontSizeForToolbar(declSize)
      : toolbarFontInheritLabel(this.uiLang());
    return { family: familyText, size: sizeText };
  }

  private createRichLineSpacingSplitButton(container: HTMLElement): void {
    const lang = this.uiLang();
    const lineLs = richLineSpacingToolbarStrings(lang);
    const wrap = container.createDiv({ cls: "yori-line-spacing-toolbar-wrap" });
    const lsLab = toolbarCommandLabel(lang, "rich-line-spacing");
    const mainBtn = wrap.createEl("button", {
      attr: {
        "aria-label": lsLab
      }
    });
    setIcon(mainBtn, "list-chevrons-up-down");

    const panel = wrap.createDiv({ cls: "yori-line-spacing-panel" });
    this.richLineSpacingPanelEl = panel;
    this.richLineSpacingMainBtnEl = mainBtn;

    const addRow = (label: string, dataKey: string, apply: () => void): void => {
      const btn = panel.createEl("button", {
        cls: "yori-line-spacing-option",
        attr: { type: "button", "data-yori-line-spacing": dataKey }
      });
      btn.createSpan({ cls: "yori-line-spacing-check", text: "✓" });
      btn.createSpan({ cls: "yori-line-spacing-label", text: label });
      btn.addEventListener("mousedown", (evt) => evt.preventDefault());
      btn.addEventListener("click", () => {
        apply();
        panel.removeClass("is-open");
      });
    };

    addRow(lineLs.defaultLabel, "default", () => this.applyRichLineSpacing(null));
    RICH_LINE_SPACINGS.forEach((spacing) => {
      addRow(spacing, spacing, () => this.applyRichLineSpacing(spacing));
    });

    mainBtn.addEventListener("mousedown", (evt) => evt.preventDefault());
    mainBtn.addEventListener("click", (evt) => {
      evt.stopPropagation();
      const next = !panel.hasClass("is-open");
      panel.toggleClass("is-open", next);
      if (next) this.refreshRichLineSpacingPanelIfOpen();
    });

    document.addEventListener(
      "click",
      (evt) => {
        if (!wrap.contains(evt.target as Node)) panel.removeClass("is-open");
      },
      true
    );

    this.syncRichLineSpacingToolbarState();
  }

  private createRichAlignCycleButton(container: HTMLElement): void {
    const lang = this.uiLang();
    const al = richAlignToolbarStrings(lang);
    const currentIndex = this.richAlignCurrentIndex;
    const stepCmd = RICH_ALIGN_STEPS[currentIndex].cmd;
    const stepLabel = richAlignStepLabel(lang, stepCmd);
    const btn = container.createEl("button", {
      attr: {
        "aria-label": al.ariaCycle,
        title: `${al.titlePrefix}${stepLabel}`
      }
    });
    setIcon(btn, RICH_ALIGN_STEPS[currentIndex].icon);
    this.richAlignCycleBtnEl = btn;
    btn.addEventListener("mousedown", (evt) => evt.preventDefault());
    btn.addEventListener("click", () => {
      this.cycleRichAlignmentFromCurrent();
      const step = RICH_ALIGN_STEPS[this.richAlignCurrentIndex];
      const sLab = richAlignStepLabel(lang, step.cmd);
      setIcon(btn, step.icon);
      btn.setAttr("title", `${al.titlePrefix}${sLab}`);
      btn.setAttr("aria-label", al.ariaCurrent(sLab));
    });
  }

  private createRichBorderSplitButton(container: HTMLElement): void {
    const lang = this.uiLang();
    const pb = richParagraphBorderSplitStrings(lang);
    const mainLab = toolbarCommandLabel(lang, "rich-paragraph-border");
    const wrap = container.createDiv({ cls: "yori-split-btn-wrap" });
    const mainBtn = wrap.createEl("button", {
      cls: "yori-split-main",
      attr: { "aria-label": mainLab, title: mainLab }
    });
    setIcon(mainBtn, "square");

    const arrowBtn = wrap.createEl("button", {
      cls: "yori-split-arrow",
      attr: { "aria-label": pb.optionsAria, title: pb.optionsAria }
    });
    setIcon(arrowBtn, "chevron-down");

    const panel = wrap.createDiv({ cls: "yori-border-panel" });
    this.richBorderPanelEl = panel;

    mainBtn.addEventListener("mousedown", (evt) => evt.preventDefault());
    mainBtn.addEventListener("click", () =>
      this.applyRichParagraphBorder(RICH_BORDER_MAIN_WIDTH, RICH_BORDER_DEFAULT_COLOR)
    );
    arrowBtn.addEventListener("mousedown", (evt) => evt.preventDefault());
    arrowBtn.addEventListener("click", (evt) => {
      evt.stopPropagation();
      const nextOpen = !panel.hasClass("is-open");
      if (nextOpen) {
        this.fillRichToolbarBorderPanel(panel, () => panel.removeClass("is-open"));
      }
      panel.toggleClass("is-open", nextOpen);
      if (nextOpen) this.refreshRichBorderPanelIfOpen();
    });

    document.addEventListener(
      "click",
      (evt) => {
        if (!wrap.contains(evt.target as Node)) panel.removeClass("is-open");
      },
      true
    );
  }

  private createRichTableSplitButton(container: HTMLElement): void {
    const lang = this.uiLang();
    const lab = toolbarCommandLabel(lang, "rich-insert-table");
    const btn = container.createEl("button", {
      attr: { "aria-label": lab, title: lab }
    });
    setIcon(btn, "table");
    btn.addEventListener("mousedown", (evt) => evt.preventDefault());
    btn.addEventListener("click", () =>
      this.runRichInsertHtml(richInsertTableTemplateHtml(lang))
    );
  }

  /** 表格多格 / execCommand 在 td 内不稳定：直接写单元格 text-align（与批量文字色一致） */
  private applyRichTextAlignToTableCells(cells: readonly HTMLTableCellElement[], align: "left" | "center" | "right"): void {
    for (const cell of cells) {
      cell.style.textAlign = align;
      cell.removeAttribute("align");
      cell.querySelectorAll<HTMLElement>("p, div, h1, h2, h3, h4, h5, h6").forEach((el) => {
        if (el.closest("td, th") === cell) {
          el.style.removeProperty("text-align");
        }
      });
    }
  }

  /** 表格多格加粗/倾斜在 execCommand 下不稳定，直接写 DOM 样式 */
  private getRichTableTextStyleToggleState(
    cells: readonly HTMLTableCellElement[],
    command: "bold" | "italic" | "underline" | "strikeThrough"
  ): boolean {
    if (cells.length === 0) return false;
    const allOn = cells.every((cell) => {
      const cs = window.getComputedStyle(cell);
      if (command === "bold") {
        const fw = parseInt(cs.fontWeight || "400", 10);
        return Number.isFinite(fw) ? fw >= 600 : (cs.fontWeight || "").toLowerCase() === "bold";
      }
      if (command === "italic") {
        return (cs.fontStyle || "").toLowerCase() === "italic";
      }
      const dec = (cs.textDecorationLine || "").toLowerCase();
      if (command === "underline") return dec.includes("underline");
      return dec.includes("line-through");
    });
    return !allOn;
  }

  private applyRichTableTextStyleToCells(
    cells: readonly HTMLTableCellElement[],
    command: "bold" | "italic" | "underline" | "strikeThrough",
    turnOn: boolean
  ): void {
    const targetsForCell = (cell: HTMLTableCellElement): HTMLElement[] => {
      const descendants = Array.from(cell.querySelectorAll<HTMLElement>("*"));
      return [cell, ...descendants];
    };
    for (const cell of cells) {
      for (const el of targetsForCell(cell)) {
        if (command === "bold") {
          if (turnOn) el.style.fontWeight = "700";
          else el.style.removeProperty("font-weight");
          continue;
        }
        if (command === "italic") {
          if (turnOn) el.style.fontStyle = "italic";
          else el.style.removeProperty("font-style");
          continue;
        }
        const prev = (el.style.textDecorationLine || "").toLowerCase();
        const tokens = new Set(
          prev
            .split(/\s+/)
            .map((s) => s.trim())
            .filter(Boolean)
            .filter((s) => s !== "none")
        );
        const token = command === "underline" ? "underline" : "line-through";
        if (turnOn) tokens.add(token);
        else tokens.delete(token);
        if (tokens.size === 0) el.style.removeProperty("text-decoration-line");
        else el.style.textDecorationLine = Array.from(tokens).join(" ");
      }
    }
  }

  private runRichCommand(command: string, value?: string): void {
    if (!this.richEditorEl) {
      new Notice("请先进入高级编辑模式。");
      return;
    }
    const alignByCmd: Record<string, "left" | "center" | "right"> = {
      justifyLeft: "left",
      justifyCenter: "center",
      justifyRight: "right"
    };
    const tableAlign = alignByCmd[command];
    if (tableAlign) {
      const cells = this.getRichTableCellsForBulkTextStyle();
      if (cells.length > 0) {
        this.rememberRichStateForUndo();
        this.richEditorEl.focus();
        this.applyRichTextAlignToTableCells(cells, tableAlign);
        this.markRichDirty();
        this.scheduleRichAutoSave();
        this.restoreCaretToEndOfFirstTableCell(cells);
        this.scheduleRichSelectionVisualSync();
        return;
      }
    }
    if (command === "bold" || command === "italic" || command === "underline" || command === "strikeThrough") {
      const cells = this.getRichTableCellsForBulkTextStyle();
      if (cells.length > 0) {
        const turnOn = this.getRichTableTextStyleToggleState(cells, command);
        this.rememberRichStateForUndo();
        this.richEditorEl.focus();
        this.applyRichTableTextStyleToCells(cells, command, turnOn);
        this.markRichDirty();
        this.scheduleRichAutoSave();
        this.restoreCaretToEndOfFirstTableCell(cells);
        this.scheduleRichSelectionVisualSync();
        return;
      }
    }
    if (command === "insertUnorderedList" || command === "insertOrderedList") {
      const cells = this.getRichTableCellsForBulkTextStyle();
      if (cells.length > 0) {
        this.rememberRichStateForUndo();
        this.richEditorEl.focus();
        const sel = window.getSelection();
        if (sel) {
          for (const cell of cells) {
            try {
              const range = document.createRange();
              range.selectNodeContents(cell);
              sel.removeAllRanges();
              sel.addRange(range);
              document.execCommand(command, false, value);
            } catch {
              /* ignore */
            }
          }
        }
        this.restoreCaretToEndOfFirstTableCell(cells);
        this.markRichDirty();
        this.scheduleRichAutoSave();
        this.scheduleRichSelectionVisualSync();
        return;
      }
    }
    if (command === "insertTaskList") {
      this.rememberRichStateForUndo();
      this.prepareRichEditorForExecStyleCommands();
      this.richEditorEl.focus();
      const cells = this.getRichTableCellsForBulkTextStyle();
      if (cells.length > 1) {
        for (const cell of cells) {
          if (!this.richEditorEl.contains(cell)) continue;
          focusRichTableCell(this.richEditorEl, cell, "end");
          this.applyRichInsertTaskListAtCaret();
        }
      } else if (cells.length === 1) {
        const cell = cells[0];
        if (!cell || !this.richEditorEl.contains(cell)) {
          this.applyRichInsertTaskListAtCaret();
        } else if (!isRichSelectionInsideTableCell(cell)) {
          focusRichTableCell(this.richEditorEl, cell, "end");
          this.applyRichInsertTaskListAtCaret();
        } else {
          this.applyRichInsertTaskListAtCaret();
        }
      } else {
        this.applyRichInsertTaskListAtCaret();
      }
      this.finalizeRichTaskListDomAfterMutation();
      if (cells.length > 0) {
        restoreCaretAfterRichTaskListInTableCells(this.richEditorEl, cells);
      }
      this.markRichDirty();
      this.scheduleRichAutoSave();
      this.scheduleRichSelectionVisualSync();
      return;
    }
    this.rememberRichStateForUndo();
    this.richEditorEl.focus();
    document.execCommand(command, false, value);
    this.markRichDirty();
    this.scheduleRichAutoSave();
  }

  /** 任务列表插入/切换后的统一收尾：p 内嵌列表 unwrap、Obsidian class、Grid 下行内正文包裹 */
  private finalizeRichTaskListDomAfterMutation(): void {
    if (!this.richEditorEl) return;
    unwrapRichParagraphsWrappingDirectLists(this.richEditorEl);
    normalizeRichTaskListDom(this.richEditorEl);
    this.flattenRichNestedListInsideTableTaskListItems(this.richEditorEl);
  }

  /**
   * 按当前 Selection 插入/切换任务列表。
   * 表格场景禁止对整格 selectNodeContents 再 execCommand，否则会嵌套 ul、在邻格出现列表符号并异常撑高行。
   */
  private applyRichInsertTaskListAtCaret(): void {
    if (!this.richEditorEl) return;
    const sel0 = window.getSelection();
    if (sel0?.rangeCount) {
      const n0 = sel0.anchorNode;
      const el0 = n0 instanceof Element ? n0 : n0?.parentElement;
      const li0 = el0?.closest("li");
      const ul0 = li0?.parentElement;
      if (
        li0 &&
        ul0 instanceof HTMLUListElement &&
        this.richEditorEl.contains(li0) &&
        ul0.classList.contains("contains-task-list") &&
        findTaskCheckboxOnDirectListItem(li0)
      ) {
        if (this.richUnwrapTaskListAtCaret(sel0)) return;
      }
      if (
        li0 &&
        ul0 instanceof HTMLUListElement &&
        this.richEditorEl.contains(li0) &&
        !findTaskCheckboxOnDirectListItem(li0)
      ) {
        this.richAddCheckboxToListItemsInUl(ul0);
        return;
      }
      if (this.richWrapMultipleParagraphsAsTaskList(sel0)) return;
      if (this.richTryWrapParagraphBlockAsSingleTaskList(sel0)) return;
    }
    document.execCommand("insertUnorderedList", false);
    this.richAddCheckboxToListFromSelection();
  }

  /**
   * 浏览器 contenteditable 无「任务列表」execCommand：与原生一致使用 ul/li + checkbox，
   * 并打上 Obsidian 同名 class，避免 Live Preview 里 li 默认圆点叠在复选框前。
   */
  private richAddCheckboxToListItemsInUl(ul: HTMLUListElement): void {
    ul.classList.add("contains-task-list");
    for (const child of Array.from(ul.children)) {
      if (child.tagName !== "LI") continue;
      const li = child as HTMLLIElement;
      li.classList.add("task-list-item");
      const existing = findTaskCheckboxOnDirectListItem(li);
      if (existing) {
        existing.classList.add("task-list-item-checkbox");
        continue;
      }
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = "task-list-item-checkbox";
      li.insertBefore(cb, li.firstChild);
    }
  }

  private richAddCheckboxToListFromSelection(): void {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !this.richEditorEl) return;
    const node = sel.anchorNode;
    const el = node instanceof Element ? node : node?.parentElement;
    const li = el?.closest("li");
    if (!li || !this.richEditorEl.contains(li)) return;
    const ul = li.parentElement;
    if (!(ul instanceof HTMLUListElement)) return;
    this.richAddCheckboxToListItemsInUl(ul);
  }

  /** 从节点向上找到 rich 根的直接子块（段落、列表等）。 */
  private getRichTopLevelBlockElement(node: Node | null): HTMLElement | null {
    if (!node || !this.richEditorEl) return null;
    let cur: Node | null = node.nodeType === Node.TEXT_NODE ? node.parentNode : node;
    while (cur && cur !== this.richEditorEl) {
      const parentNode: Node | null = cur.parentNode;
      if (parentNode === this.richEditorEl && cur instanceof HTMLElement) {
        return cur;
      }
      cur = parentNode;
    }
    return null;
  }

  private richParagraphIsBareTextOrBrOnly(p: HTMLParagraphElement): boolean {
    for (const c of Array.from(p.childNodes)) {
      if (c.nodeType === Node.TEXT_NODE) continue;
      if (c.nodeType === Node.ELEMENT_NODE && (c as HTMLElement).tagName === "BR") continue;
      return false;
    }
    return true;
  }

  private richParagraphContainsFontFamilyOrSizeStyle(p: HTMLParagraphElement): boolean {
    if ((p.style.fontFamily || "").trim() || (p.style.fontSize || "").trim()) return true;
    return !!p.querySelector(
      'span[style*="font-family"], span[style*="font-size"], font[face], font[size]'
    );
  }

  /**
   * extractContents 改字体后常见的「前后纯文本 p + 中间带字体 p」，任务列表前合并为一段以免只包到局部。
   */
  private richMergeClassicFontSplitTripleContaining(seed: HTMLParagraphElement): HTMLParagraphElement {
    const parent = seed.parentElement;
    if (!parent || parent !== this.richEditorEl) return seed;
    const siblings = Array.from(parent.children);
    const idx = siblings.indexOf(seed);
    if (idx < 0) return seed;

    const isMedia = (p: HTMLParagraphElement) => p.classList.contains(YORI_RICH_MEDIA_PARAGRAPH_CLASS);

    const tryMergeAtMiddle = (mid: number): HTMLParagraphElement | null => {
      if (mid < 1 || mid + 1 >= siblings.length) return null;
      const a = siblings[mid - 1];
      const b = siblings[mid];
      const c = siblings[mid + 1];
      if (
        !(a instanceof HTMLParagraphElement && b instanceof HTMLParagraphElement && c instanceof HTMLParagraphElement)
      ) {
        return null;
      }
      if (isMedia(a) || isMedia(b) || isMedia(c)) return null;
      if (a.querySelector("table, ul, ol") || b.querySelector("table, ul, ol") || c.querySelector("table, ul, ol")) {
        return null;
      }
      if (!this.richParagraphIsBareTextOrBrOnly(a) || !this.richParagraphIsBareTextOrBrOnly(c)) return null;
      if (!this.richParagraphContainsFontFamilyOrSizeStyle(b)) return null;
      if (this.richParagraphContainsFontFamilyOrSizeStyle(a) || this.richParagraphContainsFontFamilyOrSizeStyle(c)) {
        return null;
      }

      while (b.firstChild) a.appendChild(b.firstChild);
      b.remove();
      while (c.firstChild) a.appendChild(c.firstChild);
      c.remove();
      return a;
    };

    for (const mid of [idx, idx + 1, idx - 1]) {
      const merged = tryMergeAtMiddle(mid);
      if (merged) return merged;
    }
    return seed;
  }

  /**
   * 选区跨越多个顶层段落时，为每一段生成一条任务列表项（各有一个复选框）。
   */
  private collectRichTopLevelParagraphBlocksForTaskListRange(range: Range): HTMLParagraphElement[] | null {
    if (!this.richEditorEl) return null;
    const startBlock = this.getRichTopLevelBlockElement(range.startContainer);
    const endBlock = this.getRichTopLevelBlockElement(range.endContainer);
    if (
      !startBlock ||
      !endBlock ||
      !(startBlock instanceof HTMLParagraphElement) ||
      !(endBlock instanceof HTMLParagraphElement)
    ) {
      return null;
    }
    if (startBlock.parentElement !== this.richEditorEl || endBlock.parentElement !== this.richEditorEl) {
      return null;
    }
    const kids = Array.from(this.richEditorEl.children);
    const i0 = kids.indexOf(startBlock);
    const i1 = kids.indexOf(endBlock);
    if (i0 < 0 || i1 < 0) return null;
    const lo = Math.min(i0, i1);
    const hi = Math.max(i0, i1);
    const out: HTMLParagraphElement[] = [];
    for (let i = lo; i <= hi; i++) {
      const el = kids[i];
      if (!(el instanceof HTMLParagraphElement)) return null;
      if (el.classList.contains(YORI_RICH_MEDIA_PARAGRAPH_CLASS)) return null;
      if (el.querySelector("table, ul, ol")) return null;
      out.push(el);
    }
    return out.length >= 2 ? out : null;
  }

  private richWrapMultipleParagraphsAsTaskList(sel: Selection): boolean {
    if (!this.richEditorEl || sel.rangeCount === 0 || sel.isCollapsed) return false;
    const pars = this.collectRichTopLevelParagraphBlocksForTaskListRange(sel.getRangeAt(0));
    if (!pars?.length) return false;
    const ul = document.createElement("ul");
    ul.classList.add("contains-task-list");
    const ref = pars[0];
    ref.parentNode?.insertBefore(ul, ref);
    for (const p of pars) {
      const li = document.createElement("li");
      li.classList.add("task-list-item");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = "task-list-item-checkbox";
      li.appendChild(cb);
      while (p.firstChild) li.appendChild(p.firstChild);
      if (li.childNodes.length <= 1) li.appendChild(document.createElement("br"));
      ul.appendChild(li);
      p.remove();
    }
    sel.removeAllRanges();
    const nr = document.createRange();
    const firstCb = ul.querySelector("input.task-list-item-checkbox");
    if (firstCb) {
      nr.setStartAfter(firstCb);
      nr.collapse(true);
      sel.addRange(nr);
    }
    this.richEditorEl.focus({ preventScroll: true });
    return true;
  }

  /**
   * insertUnorderedList 在段内含多种字体等内联 span 时会把一行拆成多条 li；
   * 对单个顶层 &lt;p&gt; 改为整段迁入一条任务列表项。
   */
  private richTryWrapParagraphBlockAsSingleTaskList(sel: Selection): boolean {
    if (!this.richEditorEl || sel.rangeCount === 0) return false;
    const r = sel.getRangeAt(0);
    if (!sel.isCollapsed) {
      const a = this.getRichTopLevelBlockElement(r.startContainer);
      const b = this.getRichTopLevelBlockElement(r.endContainer);
      if (a && b && a !== b) return false;
    }
    const anchor = sel.anchorNode;
    if (anchor && !this.richEditorEl.contains(anchor)) return false;
    let block = this.getRichTopLevelBlockElement(anchor);
    if (!block || !(block instanceof HTMLParagraphElement)) return false;
    block = this.richMergeClassicFontSplitTripleContaining(block);
    if (block.classList.contains(YORI_RICH_MEDIA_PARAGRAPH_CLASS)) return false;
    if (block.closest("td, th")) return false;

    const ul = document.createElement("ul");
    ul.classList.add("contains-task-list");
    const li = document.createElement("li");
    li.classList.add("task-list-item");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.className = "task-list-item-checkbox";
    li.appendChild(cb);

    while (block.firstChild) {
      li.appendChild(block.firstChild);
    }
    if (li.childNodes.length <= 1) {
      li.appendChild(document.createElement("br"));
    }
    ul.appendChild(li);
    block.parentNode?.insertBefore(ul, block);
    block.remove();

    sel.removeAllRanges();
    const nr = document.createRange();
    nr.setStartAfter(cb);
    nr.collapse(true);
    sel.addRange(nr);
    return true;
  }

  /**
   * 表格内二次点任务列表时，execCommand 偶发在 li 内再嵌一层 ul/ol，叠 padding 把行高撑爆；
   * 将「任务 li 唯一直接子级列表」的内容并入外层 li（丢弃内层重复 checkbox）。
   */
  private flattenRichNestedListInsideTableTaskListItems(root: HTMLElement): void {
    const selector = "td ul.contains-task-list > li.task-list-item, th ul.contains-task-list > li.task-list-item";
    for (const li of Array.from(root.querySelectorAll(selector))) {
      if (!(li instanceof HTMLLIElement)) continue;
      if (!root.contains(li)) continue;
      const nestedLists = Array.from(li.children).filter(
        (c) => c.tagName === "UL" || c.tagName === "OL"
      ) as (HTMLUListElement | HTMLOListElement)[];
      for (const nested of nestedLists) {
        const innerLis = Array.from(nested.querySelectorAll(":scope > li"));
        if (innerLis.length !== 1) continue;
        const innerLi = innerLis[0];
        if (!(innerLi instanceof HTMLLIElement)) continue;
        for (const ch of Array.from(innerLi.childNodes)) {
          if (ch instanceof HTMLInputElement && ch.type === "checkbox") continue;
          li.insertBefore(ch, nested);
        }
        nested.remove();
      }
    }
  }

  /**
   * -toolbar 任务列表二次点击时避免再 insertUnorderedList 产生嵌套 ul；
   * 将当前 li（及必要时仅含一项的 ul）收成普通段落。
   */
  private richUnwrapTaskListAtCaret(sel: Selection): boolean {
    if (!this.richEditorEl || !sel.rangeCount) return false;
    const n0 = sel.anchorNode;
    const el0 = n0 instanceof Element ? n0 : n0?.parentElement;
    const li0 = el0?.closest("li");
    const ul0 = li0?.parentElement;
    if (
      !li0 ||
      !(ul0 instanceof HTMLUListElement) ||
      !this.richEditorEl.contains(li0) ||
      !ul0.classList.contains("contains-task-list") ||
      !findTaskCheckboxOnDirectListItem(li0)
    ) {
      return false;
    }

    const parentOfUl = ul0.parentNode;
    if (!parentOfUl) return false;

    const p = document.createElement("p");
    for (const ch of Array.from(li0.childNodes)) {
      if (ch instanceof HTMLInputElement && ch.type === "checkbox") continue;
      p.appendChild(ch);
    }
    if (p.childNodes.length === 0) p.appendChild(document.createElement("br"));

    if (ul0.children.length === 1) {
      parentOfUl.insertBefore(p, ul0);
      ul0.remove();
    } else {
      parentOfUl.insertBefore(p, li0);
      li0.remove();
      if (ul0.children.length === 0) {
        ul0.remove();
      } else {
        let anyTask = false;
        for (const c of Array.from(ul0.children)) {
          if (c.tagName !== "LI") continue;
          if (findTaskCheckboxOnDirectListItem(c as HTMLLIElement)) {
            anyTask = true;
            break;
          }
        }
        if (!anyTask) ul0.classList.remove("contains-task-list");
      }
    }

    sel.removeAllRanges();
    const r = document.createRange();
    r.selectNodeContents(p);
    r.collapse(true);
    sel.addRange(r);
    return true;
  }

  /** Chromium 在表格内用 execCommand 上色时，styleWithCSS 更稳定（生成 span 而非 font） */
  private prepareRichEditorForExecStyleCommands(): void {
    if (!this.richEditorEl) return;
    this.richEditorEl.focus();
    try {
      document.execCommand("styleWithCSS", false, "true");
    } catch {
      /* ignore */
    }
  }

  private runRichInsertHtml(html: string): void {
    if (!this.richEditorEl) {
      new Notice("请先进入高级编辑模式。");
      return;
    }
    this.rememberRichStateForUndo();
    this.richEditorEl.focus();
    document.execCommand("insertHTML", false, html);
    if (html.includes("<table")) {
      this.normalizeAllRichTables();
    }
    this.ensureRichTrailingParagraph();
    this.markRichDirty();
    this.scheduleRichAutoSave();
  }

  /** 外链 <a> 内插入时补水合会被 commonReject 跳过（closest 到非 internal-link 的 a） */
  private escapeRichCaretFromNonInternalLinks(): void {
    if (!this.richEditorEl) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const node = sel.anchorNode;
    if (!node) return;
    const el = node instanceof Element ? node : node.parentElement;
    const a = el?.closest?.("a") as HTMLAnchorElement | null;
    if (!a || !this.richEditorEl.contains(a)) return;
    if (a.classList.contains("internal-link")) return;
    const range = document.createRange();
    range.setStartAfter(a);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  /** 插入 ![[…]]/纯文本前规范化选区，避免插入点落在不可编辑块内导致补水合跳过 */
  private normalizeRichCaretForPlainInsert(): void {
    this.escapeRichCaretFromNonInternalLinks();
  }

  private isSelectionCoveringRichEditor(): boolean {
    if (!this.richEditorEl) return false;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;
    const r = sel.getRangeAt(0);
    if (!this.richEditorEl.contains(r.commonAncestorContainer)) return false;
    const full = document.createRange();
    full.selectNodeContents(this.richEditorEl);
    return (
      r.compareBoundaryPoints(Range.START_TO_START, full) <= 0 &&
      r.compareBoundaryPoints(Range.END_TO_END, full) >= 0
    );
  }

  private clearRichEditorAllContent(): void {
    if (!this.richEditorEl) return;
    this.rememberRichStateForUndo();
    this.richEditorEl.innerHTML = "<p><br></p>";
    this.markRichDirty();
    this.scheduleRichAutoSave();
    this.scheduleRichSelectionVisualSync();
  }

  /** 可扩展：表格 / 链接等与捕获阶段 mousedown 的协调曾在此集中处理 */
  private handleRichEditorInteractionMouseDown(evt: MouseEvent): void {
    if (!this.richEditorEl || evt.button !== 0) return;
    const t = richPointerTargetElement(evt);
    if (!t || !this.richEditorEl.contains(t)) return;
  }

  /** `[[payload]]` 返回 payload（含水合后 data-yori-wikilink 字面一致）；非维基语法返回 null。 */
  private vaultWikiRawInnerBracketPayload(md: string): string | null {
    const m = md.trim().match(/^\[\[([^\]]+)\]\]$/);
    return m ? m[1].trim() : null;
  }

  /** 水合完成后执行一次：把光标移到刚插入的库链锚点之后。 */
  private applyRichCaretAfterVaultWikiInsertIfPending(): void {
    const ed = this.richEditorEl;
    const rawInner = this.richPendingCaretAfterVaultWikiRawInner;
    this.richPendingCaretAfterVaultWikiRawInner = null;
    if (!ed || rawInner == null || rawInner === "") return;
    let target: HTMLAnchorElement | null = null;
    for (const a of Array.from(ed.querySelectorAll("a.internal-link[data-yori-wikilink]"))) {
      if (!(a instanceof HTMLAnchorElement)) continue;
      if ((a.getAttribute("data-yori-wikilink") ?? "").trim() === rawInner) {
        target = a;
      }
    }
    if (!target?.isConnected) return;
    try {
      const sel = window.getSelection();
      if (!sel) return;
      const r = document.createRange();
      r.setStartAfter(target);
      r.collapse(true);
      sel.removeAllRanges();
      sel.addRange(r);
      ed.focus({ preventScroll: true });
      this.scheduleRichSelectionVisualSync();
    } catch {
      /* ignore */
    }
  }

  /** 在当前选区插入纯文本（如 ![[…]]），并触发脱水合调度 */
  private insertRichPlainAtCaret(
    text: string,
    opts?: { skipRememberUndo?: boolean; vaultWikiCaretAfter?: boolean }
  ): void {
    const ed = this.richEditorEl;
    if (!ed) {
      new Notice("请先进入高级编辑模式。");
      return;
    }
    const vaultSnap = this.richVaultLinkSavedRange;
    if (vaultSnap) {
      try {
        if (
          vaultSnap.startContainer.isConnected &&
          vaultSnap.endContainer.isConnected &&
          ed.contains(vaultSnap.commonAncestorContainer)
        ) {
          const sel0 = window.getSelection();
          if (sel0) {
            sel0.removeAllRanges();
            sel0.addRange(vaultSnap.cloneRange());
          }
        }
      } catch {
        /* ignore */
      }
    }
    const ensureSelectionInEditor = (): void => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) {
        ed.focus();
        this.placeCaretAtEndOfElement(ed);
        return;
      }
      const r = sel.getRangeAt(0);
      if (!ed.contains(r.commonAncestorContainer)) {
        ed.focus();
        this.placeCaretAtEndOfElement(ed);
      }
    };
    ensureSelectionInEditor();
    this.normalizeRichCaretForPlainInsert();
    if (!opts?.skipRememberUndo) {
      this.rememberRichStateForUndo();
    }
    ed.focus();
    const inserted = document.execCommand("insertText", false, text);
    if (!inserted) {
      const sel = window.getSelection();
      if (sel?.rangeCount) {
        const r = sel.getRangeAt(0);
        if (ed.contains(r.commonAncestorContainer)) {
          try {
            r.deleteContents();
            const tn = document.createTextNode(text);
            r.insertNode(tn);
            r.setStartAfter(tn);
            r.collapse(true);
            sel.removeAllRanges();
            sel.addRange(r);
          } catch {
            // ignore
          }
        }
      }
    }
    if (!opts?.vaultWikiCaretAfter) {
      this.richPendingCaretAfterVaultWikiRawInner = null;
    } else {
      this.richPendingCaretAfterVaultWikiRawInner = this.vaultWikiRawInnerBracketPayload(text);
    }
    this.stripLegacyRichImageResizeWraps();
    this.ensureRichTrailingParagraph();
    this.markRichDirty();
    this.scheduleRichAutoSave();
    this.scheduleHydrateRichWikilinksOnInput();
    this.richEditorScrollCaretIntoViewIfNeeded();
  }

  /** 光标落在滚动区底部时补滚，避免正文靠近底栏 */
  private richEditorScrollCaretIntoViewIfNeeded(): void {
    const wrap = this.richEditorWrapEl;
    if (!wrap || !this.richEditorEl) return;
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;
    const r = sel.getRangeAt(0);
    if (!this.richEditorEl.contains(r.startContainer)) return;
    const rect = r.getBoundingClientRect();
    if (rect.height === 0 && rect.width === 0) return;
    const wr = wrap.getBoundingClientRect();
    const margin = 100;
    if (rect.bottom > wr.bottom - margin) {
      const delta = rect.bottom - wr.bottom + margin;
      wrap.scrollBy({ top: delta, behavior: "auto" });
    }
  }

  /** 拖放落点定位插入位置（仅高级编辑区） */
  private getRichCaretRangeFromClientPointInEditor(clientX: number, clientY: number): Range | null {
    if (!this.richEditorEl) return null;
    const doc = this.richEditorEl.ownerDocument;
    let range: Range | null = null;
    const anyDoc = doc as Document & {
      caretRangeFromPoint?: (x: number, y: number) => Range | null;
      caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    };
    if (typeof anyDoc.caretRangeFromPoint === "function") {
      range = anyDoc.caretRangeFromPoint(clientX, clientY);
    } else if (typeof anyDoc.caretPositionFromPoint === "function") {
      const pos = anyDoc.caretPositionFromPoint(clientX, clientY);
      if (pos?.offsetNode) {
        range = doc.createRange();
        try {
          range.setStart(pos.offsetNode, pos.offset);
          range.collapse(true);
        } catch {
          range = null;
        }
      }
    }
    if (!range || !this.richEditorEl.contains(range.startContainer)) return null;
    return range;
  }

  private placeRichCaretFromDropPoint(clientX: number, clientY: number): void {
    if (!this.richEditorEl) return;
    const range = this.getRichCaretRangeFromClientPointInEditor(clientX, clientY);
    const sel = window.getSelection();
    if (!sel) return;
    if (range) {
      sel.removeAllRanges();
      sel.addRange(range);
      return;
    }
    this.ensureRichTrailingParagraph();
    const tail = this.richEditorEl.lastElementChild as HTMLElement | null;
    if (!tail) return;
    this.richEditorEl.focus();
    this.placeCaretAtEndOfElement(tail);
  }

  /**
   * 侧栏拖入 / OS 文件拖入等：解析 DataTransfer 中与库内文件相关的条目（与高级编辑 drop 共用）。
   * 实现见 `src/vault-drop-ingest.ts`（dragManager、`obsidian:` / `file:`、`app:`、JSON/HTML 载荷等）。
   */
  private ingestDataTransferVaultLinkPieces(
    dt: DataTransfer,
    sourcePath: string
  ): { uniqVaultFiles: TFile[]; externalFiles: File[] } | null {
    return ingestDataTransferVaultLinkPiecesFromDt(this.app, dt, sourcePath, (lp, sp) =>
      this.resolveVaultLinkDestForHydrate(lp, sp)
    );
  }

  private ingestVaultLinkPiecesFromSnapshot(
    snap: { files: File[]; payloads: Record<string, string> },
    sourcePath: string
  ): { uniqVaultFiles: TFile[]; externalFiles: File[] } | null {
    return ingestVaultLinkPiecesFromSnapshotCore(this.app, snap, sourcePath, (lp, sp) =>
      this.resolveVaultLinkDestForHydrate(lp, sp)
    );
  }

  private ensureAttachmentFileInput(): HTMLInputElement {
    if (this.attachmentFileInputEl?.isConnected) return this.attachmentFileInputEl;
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.style.cssText = "position:fixed;left:-9999px;opacity:0;pointer-events:none;width:0;height:0;";
    document.body.appendChild(input);
    this.attachmentFileInputEl = input;
    return input;
  }

  private pickLocalFilesForAttachment(): void {
    const input = this.ensureAttachmentFileInput();
    input.value = "";
    input.onchange = (): void => {
      const list = input.files ? Array.from(input.files) : [];
      input.onchange = null;
      void this.insertAttachmentsFromUserPick(list);
    };
    input.click();
  }

  /** 将用户选择的本地文件复制到库的附件目录并插入链接（高级模式写入富文本区，原生增强写入当前 Markdown 编辑器） */
  private async insertAttachmentsFromUserPick(files: File[]): Promise<void> {
    if (files.length === 0) return;
    const isRich = this.settings.toolbarMode === "rich";
    const sourcePath = isRich ? this.resolveHydrationSourcePath() : (this.app.workspace.getActiveFile()?.path ?? "");
    if (!sourcePath) {
      new Notice("请先打开一篇笔记。");
      return;
    }
    try {
      const created: TFile[] = [];
      for (const f of files) {
        created.push(await copyFileIntoVaultAsAttachment(this.app, f, sourcePath));
      }
      const md = created.map((tf) => markdownLinkForDroppedVaultFile(this.app, tf, sourcePath)).join("\n\n");
      if (isRich) {
        this.richEditorEl?.focus({ preventScroll: true });
        this.insertRichPlainAtCaret(md);
        this.scheduleRichEditorHydratePasses();
      } else {
        const editor = this.getActiveEditor();
        if (!editor) {
          new Notice("请打开一篇笔记并聚焦编辑器。");
          return;
        }
        editor.replaceSelection(md);
      }
    } catch (e) {
      console.error(e);
      new Notice("导入附件失败，请检查库权限与附件路径设置。");
    }
  }

  /**
   * 拖拽事件的命中节点可能在 `.yori-rich-editor-wrap` 自身（两侧留白等）；`contains` 不包含容器自身，否则会误判并跳过 drop。
   */
  private richDragEventInvolvesWrap(evt: DragEvent): boolean {
    const wrap = this.richEditorWrapEl;
    if (!wrap) return false;
    for (const n of evt.composedPath()) {
      if (n === wrap) return true;
      if (n instanceof Node && wrap.contains(n)) return true;
    }
    return false;
  }

  /**
   * 在捕获阶段接管侧栏文件拖入，同步读 DataTransfer 并插入链接，避免默认行为写到隐藏的 CodeMirror 导致「永远上一次文件」。
   */
  private handleRichEditorDragOver(evt: DragEvent): void {
    if (!this.richEditorWrapEl || !this.richEditorEl || this.settings.toolbarMode !== "rich") return;
    if (!this.richDragEventInvolvesWrap(evt)) return;
    evt.preventDefault();
    evt.stopPropagation();
    const dtr = evt.dataTransfer;
    if (dtr) {
      dtr.dropEffect = this.richInternalDragMediaParagraph != null ? "move" : "copy";
    }
  }

  /** 在高级编辑内从媒体块开始拖动：写入当前嵌入 raw，供 drop 侧整段移动（保留管道宽度等） */
  private handleRichEditorEmbedDragStart(evt: DragEvent): void {
    if (!this.richEditorEl || this.settings.toolbarMode !== "rich") return;
    const t = evt.target;
    if (!(t instanceof Node) || !this.richEditorEl.contains(t)) return;
    const el = t instanceof Element ? t : t.parentElement;
    if (el?.closest(".yori-rich-img-resize-handle")) {
      evt.preventDefault();
      return;
    }
    const mp = el?.closest(`.${YORI_RICH_MEDIA_PARAGRAPH_CLASS}`) as HTMLElement | null;
    if (!mp || !this.richEditorEl.contains(mp)) return;
    const raw = this.getRichMediaParagraphEmbedRaw(mp);
    if (!raw) return;
    this.richInternalDragMediaParagraph = mp;
    const dt = evt.dataTransfer;
    if (dt) {
      dt.setData("text/plain", `![[${raw}]]`);
      dt.setData("application/x-yori-rich-embed", raw);
      dt.effectAllowed = "copyMove";
    }
    const bumpCursor = (): void => {
      this.resetRichDragCursorUI();
    };
    window.addEventListener("pointerup", bumpCursor, { capture: true, once: true });
    window.addEventListener("mouseup", bumpCursor, { capture: true, once: true });
  }

  private applyRichIngestedVaultDrop(
    evt: DragEvent,
    ingested: { uniqVaultFiles: TFile[]; externalFiles: File[] },
    sourcePath: string
  ): void {
    if (!this.richEditorEl) return;
    const hasExternal = ingested.externalFiles.length > 0;
    if (this.richHostView) blurMarkdownSourceEditor(this.richHostView);
    this.richEditorEl.focus({ preventScroll: true });
    const mdForVault = (tf: TFile): string => markdownLinkForDroppedVaultFile(this.app, tf, sourcePath);
    if (!hasExternal) {
      this.placeRichCaretFromDropPoint(evt.clientX, evt.clientY);
      if (ingested.uniqVaultFiles.length === 0) return;
      this.insertRichPlainAtCaret(ingested.uniqVaultFiles.map(mdForVault).join("\n\n"));
      this.scheduleRichEditorHydratePasses();
      return;
    }
    void (async (): Promise<void> => {
      try {
        this.placeRichCaretFromDropPoint(evt.clientX, evt.clientY);
        const chunks: string[] = ingested.uniqVaultFiles.map(mdForVault);
        for (const file of ingested.externalFiles) {
          const created = await copyFileIntoVaultAsAttachment(this.app, file, sourcePath);
          chunks.push(mdForVault(created));
        }
        if (chunks.length === 0) return;
        this.insertRichPlainAtCaret(chunks.join("\n\n"));
        this.scheduleRichEditorHydratePasses();
      } catch (e) {
        console.error(e);
        new Notice("导入附件失败，请检查库权限与附件路径设置。");
      }
    })();
  }

  private async finishRichEditorVaultDropWithAsyncStrings(evt: DragEvent, dt: DataTransfer, sourcePath: string): Promise<void> {
    const stringPayloads = await pullDataTransferStringItemsAsync(dt);
    const snap = snapshotRichDataTransferSync(dt);
    const payloads = { ...snap.payloads };
    for (const [k, v] of Object.entries(stringPayloads)) {
      if (!v) continue;
      payloads[k] = payloads[k] ? `${payloads[k]}\n${v}` : v;
    }
    const ingested = this.ingestVaultLinkPiecesFromSnapshot({ files: snap.files, payloads }, sourcePath);
    if (!ingested) return;
    this.applyRichIngestedVaultDrop(evt, ingested, sourcePath);
  }

  private handleRichEditorDrop(evt: DragEvent): void {
    if (!this.richEditorWrapEl || !this.richEditorEl || this.settings.toolbarMode !== "rich") return;
    if (!this.richDragEventInvolvesWrap(evt)) return;
    const dt = evt.dataTransfer;
    if (!dt) return;

    const t = evt.target;

    const sourcePath = this.resolveHydrationSourcePath();
    const internalMp = this.richInternalDragMediaParagraph;
    if (internalMp && this.richEditorEl.contains(internalMp)) {
      const raw = this.getRichMediaParagraphEmbedRaw(internalMp);
      if (raw && !(t instanceof Node && internalMp.contains(t))) {
        evt.preventDefault();
        evt.stopPropagation();
        evt.stopImmediatePropagation();
        if (this.richHostView) blurMarkdownSourceEditor(this.richHostView);
        this.richEditorEl.focus({ preventScroll: true });
        this.rememberRichStateForUndo();
        internalMp.remove();
        this.insertDetachedRichMediaParagraphFromDrop(internalMp, evt);
        this.markRichDirty();
        this.scheduleRichAutoSave();
        this.scheduleRichSelectionVisualSync();
        this.finishRichHtmlDragCleanup(evt.clientX, evt.clientY);
        return;
      }
      if (raw && t instanceof Node && internalMp.contains(t)) {
        evt.preventDefault();
        evt.stopPropagation();
        evt.stopImmediatePropagation();
        return;
      }
    }

    if (!sourcePath) {
      new Notice("请先打开一篇笔记。");
      return;
    }

    let ingested = this.ingestDataTransferVaultLinkPieces(dt, sourcePath);
    if (!ingested) {
      const items = Array.from(dt.items ?? []);
      const retryAsync =
        items.some((it) => it.kind === "string") ||
        items.some((it) => it.kind === "file") ||
        (dt.files?.length ?? 0) > 0;
      if (retryAsync) {
        evt.preventDefault();
        evt.stopPropagation();
        evt.stopImmediatePropagation();
        void this.finishRichEditorVaultDropWithAsyncStrings(evt, dt, sourcePath);
      }
      return;
    }

    evt.preventDefault();
    evt.stopPropagation();
    evt.stopImmediatePropagation();

    this.applyRichIngestedVaultDrop(evt, ingested, sourcePath);
  }

  private executeObsidianCommandById(id: string): boolean {
    return obsidianExecuteCommandById(this.app, id);
  }

  /**
   * 与 runNativeOnly 相同解析顺序，但不弹 Notice；用于「先试原生命令，失败再手写编辑」。
   * @see src/obsidian-native-command-bridge.ts tryRunNativeOnlyQuiet
   */
  private tryRunNativeOnlyQuiet(
    nativeIds: string[],
    extra?: { idFragments?: string[][]; nameFragments?: string[][] }
  ): boolean {
    return obsidianTryRunNativeOnlyQuiet(this.app, nativeIds, extra);
  }

  /**
   * 执行 Obsidian 内置编辑命令：先试固定 id，再按 id 片段 / 显示名片段在 `app.commands.commands` 中解析。
   */
  private runNativeOnly(
    nativeIds: string[],
    featureName: string,
    extra?: { idFragments?: string[][]; nameFragments?: string[][] }
  ): void {
    if (this.tryRunNativeOnlyQuiet(nativeIds, extra)) return;
    new Notice(`当前环境未找到 Obsidian 原生命令：${featureName}`);
  }

  private runNativeWithFallback(nativeIds: string[], fallback: () => void): void {
    if (obsidianTryExecuteCommandIds(this.app, nativeIds)) return;
    fallback();
  }

  /** 与注册命令 `checkbox` 相同：先试 Obsidian 内置任务/循环列表命令，失败再改写为 `- [ ]` Markdown。 */
  private applyMarkdownTaskListFromUser(editor: Editor | undefined): void {
    const ed = editor ?? this.getActiveMarkdownView()?.editor;
    if (!ed) {
      new Notice("请先打开一篇笔记并聚焦编辑区，再使用任务列表。");
      return;
    }
    const nativeIds = [
      "editor:cycle-bullet-checkbox",
      "editor:cycle-bullet-list-checkbox",
      "editor:toggle-task-list",
      "editor:toggle-checklist",
      "editor:checklist",
      "editor:insert-checklist",
      "editor:toggle-checkbox-status",
      "markdown:toggle-task-list",
    ] as const;
    const extra = {
      idFragments: [
        ["cycle", "bullet", "checkbox"],
        ["cycle", "checkbox"],
        ["cycle", "bullet", "list"],
        ["toggle", "checkbox", "status"],
        ["toggle", "task", "list"],
        ["toggle", "checklist"],
      ],
      nameFragments: [
        ["cycle", "bullet", "checkbox"],
        ["toggle", "checkbox", "status"],
        ["切换", "复选框"],
        ["循环", "复选框"],
        ["项目符号", "复选框"],
        ["任务", "列表"],
      ],
    };
    if (this.tryRunNativeOnlyQuiet([...nativeIds], extra)) return;
    this.applyNativeLikeTaskList(ed);
  }

  /**
   * openAngleIndex 指向 `<`，且为 `span` / `mark` 起始标签；返回配对结束标签之后（不含）的偏移。
   */
  private findBalancedInlineEndAfterOpen(text: string, openAngleIndex: number): number {
    const tail = text.slice(openAngleIndex);
    let openLen = 0;
    if (/^<mark\s+style="background-color:[^"]*;">/.test(tail)) {
      openLen = tail.match(/^<mark\s+style="background-color:[^"]*;">/)![0].length;
    } else if (/^<span(?:\s+style="[^"]*")?\s*>/.test(tail)) {
      openLen = tail.match(/^<span(?:\s+style="[^"]*")?\s*>/)![0].length;
    } else {
      return openAngleIndex;
    }
    const isMarkOpen = /^<mark\s+style="background-color:[^"]*;">/.test(tail);
    const stack: Array<"span" | "mark"> = [isMarkOpen ? "mark" : "span"];
    let i = openAngleIndex + openLen;
    while (i < text.length && stack.length > 0) {
      const lt = text.indexOf("<", i);
      if (lt < 0) break;
      const sub = text.slice(lt);
      if (/^<span(?:\s+style="[^"]*")?\s*>/.test(sub)) {
        const m = sub.match(/^<span(?:\s+style="[^"]*")?\s*>/)!;
        stack.push("span");
        i = lt + m[0].length;
      } else if (/^<mark\s+style="background-color:[^"]*;">/.test(sub)) {
        const m = sub.match(/^<mark\s+style="background-color:[^"]*;">/)!;
        stack.push("mark");
        i = lt + m[0].length;
      } else if (/^<\/span>/.test(sub)) {
        if (stack[stack.length - 1] !== "span") break;
        stack.pop();
        i = lt + 7;
      } else if (/^<\/mark>/.test(sub)) {
        if (stack[stack.length - 1] !== "mark") break;
        stack.pop();
        i = lt + 7;
      } else {
        i = lt + 1;
      }
      if (stack.length === 0) return i;
    }
    return openAngleIndex;
  }

  /**
   * 向左侧查找包住 [lo, hi) 的最外层 span/mark（支持多层嵌套），便于整段替换为单层样式。
   */
  private expandOffsetsToNativeInlineBounds(text: string, from: number, to: number): { from: number; to: number } {
    let lo = Math.min(from, to);
    let hi = Math.max(from, to);
    for (let iter = 0; iter < 64; iter++) {
      let changed = false;
      for (let probe = lo - 1; probe >= 0; probe--) {
        if (text[probe] !== "<") continue;
        const tail = text.slice(probe);
        const isOpen =
          /^<span(?:\s+style="[^"]*")?\s*>/.test(tail) || /^<mark\s+style="background-color:[^"]*;">/.test(tail);
        if (!isOpen) continue;
        const end = this.findBalancedInlineEndAfterOpen(text, probe);
        if (end < hi || probe >= lo) continue;
        lo = probe;
        hi = end;
        changed = true;
        break;
      }
      if (!changed) break;
    }
    return { from: lo, to: hi };
  }

  /**
   * 将选区 HTML 中的多段 span / mark 合并为至多一层 mark 包裹 + 一层带合并 style 的 span，避免反复套娃。
   */
  private normalizeNativeInlineFragment(
    fragment: string,
    patch: Partial<{ color: string; "font-family": string; "font-size": string; highlightColor: string }>
  ): { html: string; plain: string } {
    const raw = fragment;
    const doc = new DOMParser().parseFromString(
      `<div id="yori-native-style-root">${raw}</div>`,
      "text/html"
    );
    const root = doc.getElementById("yori-native-style-root");
    if (!root) {
      const plain = raw.replace(/<[^>]+>/g, "");
      return { html: raw, plain };
    }
    if (root.querySelector("parsererror")) {
      const plain = raw.replace(/<[^>]+>/g, "");
      return { html: raw, plain };
    }

    if (root.querySelector("p, div, table, ul, ol, li, pre, code, h1, h2, h3, h4, h5, h6")) {
      const plain = root.textContent ?? "";
      return { html: raw, plain };
    }

    const plain = root.textContent ?? "";
    const styles: Record<string, string> = {};

    root.querySelectorAll("span[style]").forEach((el) => {
      for (const part of (el.getAttribute("style") || "").split(";")) {
        const t = part.trim();
        if (!t) continue;
        const c = t.indexOf(":");
        if (c <= 0) continue;
        const k = t.slice(0, c).trim().toLowerCase();
        const v = t.slice(c + 1).trim();
        if (k === "color" || k === "font-family" || k === "font-size") {
          styles[k] = v;
        }
      }
    });

    let markBg: string | undefined;
    root.querySelectorAll("mark[style]").forEach((el) => {
      const m = /background-color\s*:\s*([^;]+)/i.exec(el.getAttribute("style") || "");
      if (m) markBg = m[1].trim();
    });

    if (patch.color !== undefined) styles.color = patch.color.trim();
    if (patch["font-family"] !== undefined) {
      const v = patch["font-family"].trim();
      styles["font-family"] = v ? v.replace(/"/g, "'").replace(/</g, "") : "inherit";
    }
    if (patch["font-size"] !== undefined) {
      const v = patch["font-size"].trim();
      styles["font-size"] = v ? v.replace(/"/g, "'").replace(/</g, "") : "inherit";
    }
    if (patch.highlightColor !== undefined) markBg = patch.highlightColor.trim();

    const stylePairs = (["color", "font-family", "font-size"] as const)
      .map((k) => {
        const v = styles[k];
        if (!v || v === "inherit") return "";
        return `${k}:${v};`;
      })
      .join("");

    let inner = plain;
    if (stylePairs) inner = `<span style="${stylePairs}">${inner}</span>`;
    if (markBg) inner = `<mark style="background-color:${markBg};">${inner}</mark>`;
    return { html: inner, plain };
  }

  private applyTextColor(editor: Editor, color: string): void {
    const selected = editor.getSelection();
    if (!selected) {
      new Notice("请先选中文本，再设置文字颜色。");
      return;
    }
    if (!this.replaceSelectionWithInlineStyle(editor, "span", "color", color)) return;
    this.rememberLastTextColor(color);
  }

  private applyFontFamilyMarkdown(editor: Editor, cssValue: string): void {
    const selected = editor.getSelection();
    if (!selected) {
      new Notice("请先选中文本，再设置字体。");
      return;
    }
    const from = editor.getCursor("from");
    const to = editor.getCursor("to");
    const fromOffset = editor.posToOffset(from);
    const toOffset = editor.posToOffset(to);
    const full = editor.getValue();
    const raw = (cssValue || "").trim();
    const safe = raw ? raw.replace(/"/g, "'").replace(/</g, "") : "inherit";
    const exp = this.expandOffsetsToNativeInlineBounds(full, fromOffset, toOffset);
    const frag = full.slice(exp.from, exp.to);
    const { html, plain } = this.normalizeNativeInlineFragment(frag, { "font-family": safe });
    if (!plain) return;
    editor.replaceRange(html, editor.offsetToPos(exp.from), editor.offsetToPos(exp.to));
    const vis = html.indexOf(plain);
    if (vis >= 0) {
      const a = exp.from + vis;
      editor.setSelection(editor.offsetToPos(a), editor.offsetToPos(a + plain.length));
    }
    this.rememberLastFontFamily(cssValue);
    this.refreshFontToolbarLabelsIfMounted();
  }

  private applyFontSizeMarkdown(editor: Editor, cssValue: string): void {
    const selected = editor.getSelection();
    if (!selected) {
      new Notice("请先选中文本，再设置字号。");
      return;
    }
    const from = editor.getCursor("from");
    const to = editor.getCursor("to");
    const fromOffset = editor.posToOffset(from);
    const toOffset = editor.posToOffset(to);
    const full = editor.getValue();
    const raw = (cssValue || "").trim();
    const safe = raw ? raw.replace(/"/g, "'").replace(/</g, "") : "inherit";
    const exp = this.expandOffsetsToNativeInlineBounds(full, fromOffset, toOffset);
    const frag = full.slice(exp.from, exp.to);
    const { html, plain } = this.normalizeNativeInlineFragment(frag, { "font-size": safe });
    if (!plain) return;
    editor.replaceRange(html, editor.offsetToPos(exp.from), editor.offsetToPos(exp.to));
    const vis = html.indexOf(plain);
    if (vis >= 0) {
      const a = exp.from + vis;
      editor.setSelection(editor.offsetToPos(a), editor.offsetToPos(a + plain.length));
    }
    this.rememberLastFontSize(cssValue);
    this.refreshFontToolbarLabelsIfMounted();
  }

  private applyHighlightColor(editor: Editor, color: string): void {
    const selected = editor.getSelection();
    if (!selected) {
      new Notice("请先选中文本后再高亮。");
      return;
    }
    if (!this.replaceSelectionWithInlineStyle(editor, "mark", "background-color", color)) return;
    this.rememberLastHighlightColor(color);
  }

  private clearHighlight(editor: Editor): void {
    const selected = editor.getSelection();
    if (!selected) {
      new Notice("请先选中高亮文本后再取消。");
      return;
    }
    const cleaned = selected
      .replace(/<mark\s+style="background-color:[^"]*;">/gi, "")
      .replace(/<\/mark>/gi, "");
    editor.replaceSelection(cleaned);
  }

  private clearTextColor(editor: Editor): void {
    const selected = editor.getSelection();
    if (!selected) {
      new Notice("请先选中文字后再取消。");
      return;
    }
    const cleaned = selected
      .replace(/<span\s+style="color:[^"]*;">/gi, "")
      .replace(/<\/span>/gi, "");
    editor.replaceSelection(cleaned);
  }

  private replaceSelectionWithInlineStyle(
    editor: Editor,
    tag: "span" | "mark",
    styleKey: "color" | "background-color",
    styleValue: string
  ): boolean {
    void styleKey;
    const from = editor.getCursor("from");
    const to = editor.getCursor("to");
    const fromOffset = editor.posToOffset(from);
    const toOffset = editor.posToOffset(to);
    const full = editor.getValue();
    const exp = this.expandOffsetsToNativeInlineBounds(full, fromOffset, toOffset);
    const frag = full.slice(exp.from, exp.to);
    const patch =
      tag === "mark" ? { highlightColor: styleValue } : { color: styleValue };
    const { html, plain } = this.normalizeNativeInlineFragment(frag, patch);
    if (!plain) return false;

    editor.replaceRange(html, editor.offsetToPos(exp.from), editor.offsetToPos(exp.to));
    const vis = html.indexOf(plain);
    if (vis >= 0) {
      const a = exp.from + vis;
      editor.setSelection(editor.offsetToPos(a), editor.offsetToPos(a + plain.length));
    }
    return true;
  }

  private expandOffsetsToTagBounds(
    text: string,
    from: number,
    to: number,
    openTagRegex: RegExp,
    closeTagRegex: RegExp
  ): { from: number; to: number } {
    let nextFrom = from;
    let nextTo = to;

    let changed = true;
    while (changed) {
      changed = false;
      openTagRegex.lastIndex = 0;
      closeTagRegex.lastIndex = 0;

      let m: RegExpExecArray | null;
      while ((m = openTagRegex.exec(text)) !== null) {
        const start = m.index;
        const end = m.index + m[0].length;
        if (start <= nextFrom && end >= nextFrom) {
          nextFrom = start;
          changed = true;
        }
      }

      while ((m = closeTagRegex.exec(text)) !== null) {
        const start = m.index;
        const end = m.index + m[0].length;
        if (start <= nextTo && end >= nextTo) {
          nextTo = end;
          changed = true;
        }
      }
    }

    return { from: nextFrom, to: nextTo };
  }

  private pickColorWithModal(title: string, defaultHex: string): Promise<string | null> {
    const cp = colorPickModalStrings(this.uiLang());
    return new Promise((resolve) => {
      const modal = new YoriColorPickModal(this.app, title, defaultHex, cp, resolve);
      modal.open();
    });
  }

  private applyRichTextColor(color: string): void {
    if (!this.richEditorEl) {
      new Notice("请先进入高级编辑模式。");
      return;
    }
    const tableCells = this.getRichTableCellsForBulkTextStyle();
    if (tableCells.length <= 1) {
      this.rememberRichStateForUndo();
      this.prepareRichEditorForExecStyleCommands();
      document.execCommand("foreColor", false, color);
      this.markRichDirty();
      this.scheduleRichAutoSave();
      this.rememberLastTextColor(color);
      return;
    }
    this.rememberRichStateForUndo();
    this.applyRichTextColorToCellsDom(tableCells, color);
    this.restoreCaretToEndOfFirstTableCell(tableCells);
    this.richEditorEl.focus();
    this.markRichDirty();
    this.scheduleRichAutoSave();
    this.rememberLastTextColor(color);
  }

  private richSelectionIsNonEmptyInEditor(): boolean {
    if (!this.richEditorEl) return false;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;
    const range = sel.getRangeAt(0);
    return this.richEditorEl.contains(range.commonAncestorContainer);
  }

  private isRichBlockElement(el: Element): boolean {
    return /^(P|DIV|H[1-6]|UL|OL|LI|TABLE|TR|TD|TH|BLOCKQUOTE|PRE|HR|SECTION|ARTICLE|FIGURE)$/i.test(
      el.tagName
    );
  }

  /** 去掉子树内行内的 font-family / font-size，避免外包一层无法盖住内层样式 */
  private stripRichFontPropertyOnOneElement(el: HTMLElement, property: "fontFamily" | "fontSize"): void {
    const cssKey = property === "fontFamily" ? "font-family" : "font-size";
    const attrRe =
      property === "fontFamily"
        ? /font-family\s*:\s*[^;]+;?/gi
        : /font-size\s*:\s*[^;]+;?/gi;
    el.style.removeProperty(cssKey);
    const st = el.getAttribute("style");
    if (st) {
      let next = st
        .replace(attrRe, "")
        .replace(/;\s*;/g, ";")
        .replace(/^\s*;\s*|\s*;\s*$/g, "")
        .trim();
      if (next) el.setAttribute("style", next);
      else el.removeAttribute("style");
    }
    if (property === "fontFamily" && el.tagName === "FONT") {
      el.removeAttribute("face");
    }
  }

  private stripRichFontPropertyOnElementTree(root: HTMLElement, property: "fontFamily" | "fontSize"): void {
    this.stripRichFontPropertyOnOneElement(root, property);
    root.querySelectorAll<HTMLElement>("*").forEach((el) => this.stripRichFontPropertyOnOneElement(el, property));
  }

  /** 临时容器内仅含行内内容时，清掉所有后代上的同类样式 */
  private stripRichFontOnInlineHolder(holder: HTMLElement, property: "fontFamily" | "fontSize"): void {
    holder.querySelectorAll<HTMLElement>("*").forEach((el) => this.stripRichFontPropertyOnOneElement(el, property));
  }

  /** 选区所在段落（用于在同一段内包字体而不触发 extractContents 拆段）。 */
  private getRichParagraphHostForInlineSurround(node: Node | null): HTMLParagraphElement | null {
    if (!node || !this.richEditorEl) return null;
    const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element | null);
    const p = el?.closest("p");
    if (!(p instanceof HTMLParagraphElement)) return null;
    if (!this.richEditorEl.contains(p)) return null;
    if (p.classList.contains(YORI_RICH_MEDIA_PARAGRAPH_CLASS)) return null;
    if (p.closest("td, th")) return null;
    return p;
  }

  /**
   * extractContents 在同一段 &lt;p&gt; 内选取时会拆成多个相邻 &lt;p&gt;，导致后续任务列表只包其中一段。
   * 在同一段内的选区优先 surroundContents 包一层 span，避免拆段。
   */
  private richTrySurroundSelectionWithFontSpanBeforeExtract(
    range: Range,
    property: "fontFamily" | "fontSize",
    cssVal: string,
    sel: Selection
  ): boolean {
    if (!this.richEditorEl?.contains(range.commonAncestorContainer)) return false;
    const startP = this.getRichParagraphHostForInlineSurround(range.startContainer);
    const endP = this.getRichParagraphHostForInlineSurround(range.endContainer);
    if (!startP || startP !== endP) return false;
    try {
      const span = document.createElement("span");
      range.surroundContents(span);
      this.stripRichFontPropertyOnElementTree(span, property);
      if (property === "fontFamily") span.style.fontFamily = cssVal;
      else span.style.fontSize = cssVal;
      const st = span.getAttribute("style");
      if (st) {
        const t = st.replace(/;\s*;/g, ";").replace(/^\s*;\s*|\s*;\s*$/g, "").trim();
        if (t) span.setAttribute("style", t);
        else span.removeAttribute("style");
      }
      sel.removeAllRanges();
      const nr = document.createRange();
      nr.selectNodeContents(span);
      sel.addRange(nr);
      return true;
    } catch {
      return false;
    }
  }

  private applyRichUniformFontStyle(property: "fontFamily" | "fontSize", cssVal: string): void {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) return;

    this.prepareRichEditorForExecStyleCommands();

    if (this.richTrySurroundSelectionWithFontSpanBeforeExtract(range, property, cssVal, sel)) {
      cleanupRichFontSpanSoupInTree(this.richEditorEl);
      return;
    }

    const holder = document.createElement("div");
    holder.appendChild(range.extractContents());

    const topBlocks = Array.from(holder.children).filter(
      (c) => c.nodeType === Node.ELEMENT_NODE && this.isRichBlockElement(c)
    ) as HTMLElement[];

    if (topBlocks.length === 0) {
      this.stripRichFontOnInlineHolder(holder, property);
      unwrapRedundantRichFontSpansInHolder(holder);

      const elKids = Array.from(holder.children) as HTMLElement[];
      if (
        holder.childNodes.length === 1 &&
        elKids.length === 1 &&
        elKids[0].tagName === "SPAN" &&
        elKids[0].classList.length === 0
      ) {
        const reuse = elKids[0];
        if (property === "fontFamily") reuse.style.fontFamily = cssVal;
        else reuse.style.fontSize = cssVal;
        const st = reuse.getAttribute("style");
        if (st) {
          const t = st.replace(/;\s*;/g, ";").replace(/^\s*;\s*|\s*;\s*$/g, "").trim();
          if (t) reuse.setAttribute("style", t);
          else reuse.removeAttribute("style");
        }
        range.insertNode(reuse);
        sel.removeAllRanges();
        const nr = document.createRange();
        nr.selectNodeContents(reuse);
        sel.addRange(nr);
        cleanupRichFontSpanSoupInTree(this.richEditorEl);
        return;
      }

      const span = document.createElement("span");
      if (property === "fontFamily") span.style.fontFamily = cssVal;
      else span.style.fontSize = cssVal;
      while (holder.firstChild) span.appendChild(holder.firstChild);
      range.insertNode(span);
      sel.removeAllRanges();
      const nr = document.createRange();
      nr.selectNodeContents(span);
      sel.addRange(nr);
      cleanupRichFontSpanSoupInTree(this.richEditorEl);
      return;
    }

    const insertedBlocks: HTMLElement[] = [];
    for (const block of topBlocks) {
      this.stripRichFontPropertyOnElementTree(block, property);
      if (property === "fontFamily") block.style.fontFamily = cssVal;
      else block.style.fontSize = cssVal;
      insertedBlocks.push(block);
    }
    const frag = document.createDocumentFragment();
    while (holder.firstChild) frag.appendChild(holder.firstChild);
    range.insertNode(frag);

    sel.removeAllRanges();
    const nr = document.createRange();
    const first = insertedBlocks[0];
    const last = insertedBlocks[insertedBlocks.length - 1];
    if (first?.isConnected && last?.isConnected) {
      nr.setStartBefore(first);
      nr.setEndAfter(last);
      sel.addRange(nr);
    }
    cleanupRichFontSpanSoupInTree(this.richEditorEl);
  }

  private applyRichSpanStyleAroundSelection(property: "fontFamily" | "fontSize", cssVal: string): void {
    this.applyRichUniformFontStyle(property, cssVal);
  }

  private applyRichFontToCellsDom(
    cells: readonly HTMLTableCellElement[],
    cssProperty: "font-family" | "font-size",
    presetValue: string
  ): void {
    const v = presetValue.trim() ? presetValue.trim() : "inherit";
    for (const cell of cells) {
      cell.style.setProperty(cssProperty, v);
      cell.querySelectorAll<HTMLElement>("*").forEach((el) => {
        el.style.setProperty(cssProperty, v);
      });
    }
  }

  private applyRichFontFamily(value: string): void {
    if (!this.richEditorEl) {
      new Notice("请先进入高级编辑模式。");
      return;
    }
    const tableCells = this.getRichTableCellsForBulkTextStyle();
    const cssVal = value.trim() ? value.trim() : "inherit";
    if (tableCells.length <= 1 && !this.richSelectionIsNonEmptyInEditor()) {
      new Notice("请先选中文本。");
      return;
    }
    this.rememberRichStateForUndo();
    if (tableCells.length > 1) {
      this.applyRichFontToCellsDom(tableCells, "font-family", value);
      this.restoreCaretToEndOfFirstTableCell(tableCells);
      this.richEditorEl.focus();
    } else {
      this.applyRichSpanStyleAroundSelection("fontFamily", cssVal);
      this.richEditorEl.focus();
    }
    this.markRichDirty();
    this.scheduleRichAutoSave();
    this.rememberLastFontFamily(value);
  }

  private applyRichFontSize(value: string): void {
    if (!this.richEditorEl) {
      new Notice("请先进入高级编辑模式。");
      return;
    }
    const tableCells = this.getRichTableCellsForBulkTextStyle();
    const cssVal = value.trim() ? value.trim() : "inherit";
    if (tableCells.length <= 1 && !this.richSelectionIsNonEmptyInEditor()) {
      new Notice("请先选中文本。");
      return;
    }
    this.rememberRichStateForUndo();
    if (tableCells.length > 1) {
      this.applyRichFontToCellsDom(tableCells, "font-size", value);
      this.restoreCaretToEndOfFirstTableCell(tableCells);
      this.richEditorEl.focus();
    } else {
      this.applyRichSpanStyleAroundSelection("fontSize", cssVal);
      this.richEditorEl.focus();
    }
    this.markRichDirty();
    this.scheduleRichAutoSave();
    this.rememberLastFontSize(value);
  }

  private async applyRichTextColorCustom(): Promise<void> {
    const color = await this.pickColorWithModal(
      pickColorModalStrings(this.uiLang()).customTextColor,
      this.settings.lastTextColor
    );
    if (!color) return;
    this.applyRichTextColor(color);
  }

  private async applyRichHighlightColorCustom(): Promise<void> {
    const color = await this.pickColorWithModal(
      pickColorModalStrings(this.uiLang()).customHighlightColor,
      this.settings.lastHighlightColor
    );
    if (!color) return;
    this.applyRichHighlightColor(color);
  }

  private normalizeToolbarPresetColor(value: string): string {
    const v = (value || "").trim();
    if (!v || v === "transparent") return "";
    const probe = document.createElement("span");
    probe.style.color = v;
    document.body.appendChild(probe);
    const n = (window.getComputedStyle(probe).color || "").replace(/\s+/g, "").toLowerCase();
    probe.remove();
    return n;
  }

  private getRichToolbarSelectionColor(kind: "fore" | "hilite"): string {
    if (!this.richEditorEl) return "";
    const ae = document.activeElement;
    if (!ae || (ae !== this.richEditorEl && !this.richEditorEl.contains(ae))) return "";
    this.richEditorEl.focus();
    try {
      const cmd = kind === "hilite" ? "backColor" : "foreColor";
      const raw = document.queryCommandValue(cmd);
      if (typeof raw === "string" && raw && raw !== "false") return raw;
    } catch {
      /* ignore */
    }
    return "";
  }

  private fillRichToolbarColorPanel(
    panel: HTMLElement,
    selectedRawColor: string,
    callbacks: {
      onPick: (hex: string) => void;
      onClear: () => void;
      onCustom: () => void;
      onClosePanel: () => void;
    }
  ): void {
    panel.empty();
    panel.addClass("yori-toolbar-color-panel-rich");
    const selNorm = this.normalizeToolbarPresetColor(selectedRawColor);
    const lang = this.uiLang();
    const tm = richTableMenuStrings(lang);
    const grid = panel.createDiv({ cls: "yori-rich-table-color-grid" });
    RICH_COLOR_GRID_HUE_ROWS.forEach((row) => {
      const rowEl = grid.createDiv({ cls: "yori-rich-table-color-row" });
      row.forEach((hex) => {
        const swatch = rowEl.createEl("button", {
          cls: "yori-rich-table-color-swatch",
          attr: { "aria-label": tm.ariaPickColor(hex), title: hex }
        });
        swatch.style.backgroundColor = hex;
        if (selNorm && this.normalizeToolbarPresetColor(hex) === selNorm) {
          swatch.addClass("is-active");
        }
        swatch.addEventListener("mousedown", (evt) => evt.preventDefault());
        swatch.addEventListener("click", () => {
          callbacks.onPick(hex);
          callbacks.onClosePanel();
        });
      });
    });
    panel.createDiv({ cls: "yori-rich-table-context-divider" });
    const clearBtn = panel.createEl("button", { cls: "yori-rich-table-context-item", text: tm.clearCellColor });
    clearBtn.addEventListener("mousedown", (evt) => evt.preventDefault());
    clearBtn.addEventListener("click", () => {
      callbacks.onClear();
      callbacks.onClosePanel();
    });
    const customBtn = panel.createEl("button", { cls: "yori-rich-table-context-item", text: tm.customColor });
    customBtn.addEventListener("mousedown", (evt) => evt.preventDefault());
    customBtn.addEventListener("click", () => {
      callbacks.onCustom();
      callbacks.onClosePanel();
    });
  }

  /** 与色块网格比较用：将 border-color 解析为规范化 rgb 串。 */
  private normalizeToolbarPresetBorderColor(value: string): string {
    const v = (value || "").trim();
    if (!v || v === "transparent") return "";
    const probe = document.createElement("div");
    probe.style.border = `1px solid ${v}`;
    document.body.appendChild(probe);
    const n = (window.getComputedStyle(probe).borderColor || "").replace(/\s+/g, "").toLowerCase();
    probe.remove();
    return n;
  }

  /** 高级编辑段落边框下拉：色盘在上，线宽与清除/自定义依次排列。 */
  private fillRichToolbarBorderPanel(panel: HTMLElement, onClosePanel: () => void): void {
    panel.empty();
    panel.addClass("yori-toolbar-color-panel-rich");
    const lang = this.uiLang();
    const tm = richTableMenuStrings(lang);
    const pcm = pickColorModalStrings(lang);
    const selectedRaw = this.getRichToolbarBorderSelectionColor();
    const selNorm = this.normalizeToolbarPresetBorderColor(selectedRaw);
    const grid = panel.createDiv({ cls: "yori-rich-table-color-grid" });
    RICH_COLOR_GRID_HUE_ROWS.forEach((row) => {
      const rowEl = grid.createDiv({ cls: "yori-rich-table-color-row" });
      row.forEach((hex) => {
        const swatch = rowEl.createEl("button", {
          cls: "yori-rich-table-color-swatch",
          attr: { "aria-label": tm.ariaBorderColor(hex), title: hex }
        });
        swatch.style.backgroundColor = hex;
        if (selNorm && this.normalizeToolbarPresetBorderColor(hex) === selNorm) {
          swatch.addClass("is-active");
        }
        swatch.addEventListener("mousedown", (evt) => evt.preventDefault());
        swatch.addEventListener("click", () => {
          this.applyRichParagraphBorderColor(hex);
          onClosePanel();
        });
      });
    });
    panel.createDiv({ cls: "yori-rich-table-context-divider" });
    RICH_BORDER_WIDTH_PRESETS.forEach((preset) => {
      const btn = panel.createEl("button", {
        cls: "yori-border-width-option",
        attr: { type: "button", "data-yori-border-width": preset.width }
      });
      btn.createSpan({ cls: "yori-border-width-check", text: "✓" });
      btn.createSpan({ cls: "yori-border-width-label", text: richBorderWidthPresetLabel(lang, preset.width) });
      btn.addEventListener("mousedown", (evt) => evt.preventDefault());
      btn.addEventListener("click", () => {
        this.applyRichParagraphBorderWidth(preset.width);
        onClosePanel();
      });
    });
    panel.createDiv({ cls: "yori-rich-table-context-divider" });
    const clearBtn = panel.createEl("button", { cls: "yori-rich-table-context-item", text: tm.clearBorder });
    clearBtn.addEventListener("mousedown", (evt) => evt.preventDefault());
    clearBtn.addEventListener("click", () => {
      this.clearRichParagraphBorder();
      onClosePanel();
    });
    const customBtn = panel.createEl("button", { cls: "yori-rich-table-context-item", text: tm.customBorderColor });
    customBtn.addEventListener("mousedown", (evt) => evt.preventDefault());
    customBtn.addEventListener("click", () => {
      void (async () => {
        const hex = await this.pickColorWithModal(pcm.borderColor, this.getRichBorderCustomColorInitial());
        if (!hex) return;
        this.applyRichParagraphBorderColor(hex);
        onClosePanel();
      })();
    });
  }

  /** 与行间距面板一致：仅当选中边框均为同一预设线宽时显示 ✓，否则不高亮任一项。 */
  private resolveRichBorderWrapperWidthPresetKey(w: HTMLElement): string | null {
    const bw = parseFloat(window.getComputedStyle(w).borderTopWidth || "0");
    if (!Number.isFinite(bw) || bw <= 0) return null;
    for (const p of RICH_BORDER_WIDTH_PRESETS) {
      const pw = parseFloat(p.width);
      if (Math.abs(bw - pw) < 0.99) return p.width;
    }
    return null;
  }

  private getRichBorderActiveWidthKey(): string | null {
    const targets = this.collectRichBorderWrappersForSelection(false);
    if (!targets.length) return null;
    const keys = new Set<string | null>(targets.map((w) => this.resolveRichBorderWrapperWidthPresetKey(w)));
    if (keys.size !== 1) return null;
    const only = [...keys][0];
    return only ?? null;
  }

  private refreshRichBorderPanelIfOpen(): void {
    const panel = this.richBorderPanelEl;
    if (!panel?.hasClass("is-open")) return;
    const active = this.getRichBorderActiveWidthKey();
    panel.querySelectorAll("[data-yori-border-width]").forEach((el) => {
      const btn = el as HTMLElement;
      const key = btn.getAttribute("data-yori-border-width");
      btn.toggleClass("is-active", key != null && key === active);
    });
  }

  private getRichBorderCustomColorInitial(): string {
    const raw = this.getRichToolbarBorderSelectionColor();
    const hex = this.rgbCssColorToHex(raw);
    return hex ?? RICH_BORDER_DEFAULT_COLOR;
  }

  private getRichToolbarBorderSelectionColor(): string {
    const targets = this.collectRichBorderWrappersForSelection(false);
    if (!targets.length) return "";
    return window.getComputedStyle(targets[0]).borderColor || "";
  }

  private rgbCssColorToHex(rgb: string): string | null {
    const m = (rgb || "").replace(/\s+/g, "").match(/^rgba?\((\d+),(\d+),(\d+)/i);
    if (!m) return null;
    const h = (n: string) => parseInt(n, 10).toString(16).padStart(2, "0");
    return `#${h(m[1])}${h(m[2])}${h(m[3])}`;
  }

  private getRichBorderFrameResolvedColorHex(w: HTMLElement): string {
    const bw = parseFloat(window.getComputedStyle(w).borderTopWidth || "0");
    if (bw <= 0) return RICH_BORDER_DEFAULT_COLOR;
    const hex = this.rgbCssColorToHex(window.getComputedStyle(w).borderColor);
    return hex ?? RICH_BORDER_DEFAULT_COLOR;
  }

  private applyRichParagraphBorderWidth(width: string): void {
    if (!this.richEditorEl) {
      new Notice("请先进入高级编辑模式。");
      return;
    }
    this.rememberRichStateForUndo(true);
    const targets = this.collectRichBorderWrappersForSelection(true);
    if (!targets.length) {
      new Notice("请先选中段落后再调整边框粗细（表格单元格、列表项内不可用）。");
      return;
    }
    targets.forEach((w) => {
      w.classList.add(YORI_RICH_BORDERED_CLASS);
      const color = this.getRichBorderFrameResolvedColorHex(w);
      w.style.border = `${width} solid ${color}`;
    });
    this.markRichDirty();
    this.scheduleRichAutoSave();
    this.ensureRichTrailingParagraph();
    this.refreshRichBorderPanelIfOpen();
  }

  private applyRichHighlightColor(color: string): void {
    if (!this.richEditorEl) {
      new Notice("请先进入高级编辑模式。");
      return;
    }
    const tableCells = this.getRichTableCellsForBulkTextStyle();
    if (tableCells.length <= 1) {
      this.rememberRichStateForUndo();
      this.prepareRichEditorForExecStyleCommands();
      const cellBgs = this.snapshotIntersectingTableCellBackgrounds();
      document.execCommand("hiliteColor", false, color);
      this.restoreTableCellBackgrounds(cellBgs);
      this.fixRichHighlightMarkForegroundAfterHiliteCommand();
      this.markRichDirty();
      this.scheduleRichAutoSave();
      this.rememberLastHighlightColor(color);
      return;
    }
    this.rememberRichStateForUndo();
    this.applyRichHighlightToCellsDom(tableCells, color);
    this.restoreCaretToEndOfFirstTableCell(tableCells);
    this.richEditorEl.focus();
    this.markRichDirty();
    this.scheduleRichAutoSave();
    this.rememberLastHighlightColor(color);
  }

  private snapshotIntersectingTableCellBackgrounds(): Map<HTMLElement, string> {
    const map = new Map<HTMLElement, string>();
    if (!this.richEditorEl) return map;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return map;
    const range = sel.getRangeAt(0);
    this.richEditorEl.querySelectorAll("td, th").forEach((cell) => {
      const el = cell as HTMLElement;
      const bg = el.style.backgroundColor;
      if (!bg) return;
      if (el.contains(range.startContainer) || el.contains(range.endContainer)) {
        map.set(el, bg);
      }
    });
    return map;
  }

  private restoreTableCellBackgrounds(cellBgs: Map<HTMLElement, string>): void {
    cellBgs.forEach((bg, el) => {
      if (el.isConnected) el.style.backgroundColor = bg;
    });
  }

  /** 仅移除选区内前景色，不影响高亮背景 */
  private stripRichForegroundColorStylesInRange(range: Range): void {
    if (!this.richEditorEl) return;
    const candidates = Array.from(this.richEditorEl.querySelectorAll<HTMLElement>("span, font")).filter((el) => {
      try {
        return (
          range.intersectsNode(el) &&
          (!!(el.style.color && el.style.color.trim()) || el.hasAttribute("color"))
        );
      } catch {
        return false;
      }
    });
    candidates.forEach((el) => {
      el.style.removeProperty("color");
      el.removeAttribute("color");
      if (
        (el.tagName === "SPAN" || el.tagName === "FONT") &&
        !(el.style.cssText || "").trim() &&
        el.attributes.length === 0
      ) {
        this.unwrapDomElement(el);
      }
    });
  }

  /** 仅移除选区内高亮（mark / 背景色），不改前景 color */
  private stripRichHighlightStylesInRange(range: Range): void {
    if (!this.richEditorEl) return;
    const marks = Array.from(this.richEditorEl.querySelectorAll("mark")).filter((m) => {
      try {
        return range.intersectsNode(m);
      } catch {
        return false;
      }
    });
    marks.sort((a, b) => {
      if (a.contains(b)) return 1;
      if (b.contains(a)) return -1;
      return 0;
    });
    marks.forEach((m) => this.unwrapDomElement(m));

    const spans = Array.from(this.richEditorEl.querySelectorAll<HTMLElement>("span[style], font[style]")).filter(
      (el) => {
        try {
          if (!range.intersectsNode(el)) return false;
          const bg = (el.style.backgroundColor || el.style.background || "").trim();
          return !!bg && bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)";
        } catch {
          return false;
        }
      }
    );
    spans.forEach((el) => {
      el.style.removeProperty("background-color");
      el.style.removeProperty("background");
      if (!(el.style.cssText || "").trim()) el.removeAttribute("style");
      if (el.tagName === "SPAN" && !el.attributes.length) this.unwrapDomElement(el);
    });
  }

  private clearRichTextColor(): void {
    if (!this.richEditorEl) {
      new Notice("请先进入高级编辑模式。");
      return;
    }
    const tableCells = this.getRichTableCellsForBulkTextStyle();
    if (tableCells.length > 1) {
      this.rememberRichStateForUndo();
      this.clearRichTextColorInCellsDom(tableCells);
      this.restoreCaretToEndOfFirstTableCell(tableCells);
      this.richEditorEl.focus();
      this.markRichDirty();
      this.scheduleRichAutoSave();
      return;
    }
    this.rememberRichStateForUndo();
    this.richEditorEl.focus();
    const sel = window.getSelection();
    if (sel?.rangeCount) {
      const cellBgs = this.snapshotIntersectingTableCellBackgrounds();
      this.stripRichForegroundColorStylesInRange(sel.getRangeAt(0));
      this.restoreTableCellBackgrounds(cellBgs);
    }
    this.markRichDirty();
    this.scheduleRichAutoSave();
  }

  private clearRichHighlight(): void {
    if (!this.richEditorEl) {
      new Notice("请先进入高级编辑模式。");
      return;
    }
    const tableCells = this.getRichTableCellsForBulkTextStyle();
    if (tableCells.length > 1) {
      this.rememberRichStateForUndo();
      this.clearRichHighlightInCellsDom(tableCells);
      this.restoreCaretToEndOfFirstTableCell(tableCells);
      this.richEditorEl.focus();
      this.markRichDirty();
      this.scheduleRichAutoSave();
      return;
    }
    this.rememberRichStateForUndo();
    this.richEditorEl.focus();
    const sel = window.getSelection();
    if (sel?.rangeCount) {
      const cellBgs = this.snapshotIntersectingTableCellBackgrounds();
      this.stripRichHighlightStylesInRange(sel.getRangeAt(0));
      this.restoreTableCellBackgrounds(cellBgs);
    }
    this.markRichDirty();
    this.scheduleRichAutoSave();
  }

  private parseRichLineHeightToFactor(block: HTMLElement, inlineRaw: string): number | null {
    const inline = inlineRaw.trim().toLowerCase();
    if (!inline || inline === "normal" || inline === "inherit" || inline === "initial") return null;
    const fs = parseFloat(window.getComputedStyle(block).fontSize);
    if (!Number.isFinite(fs) || fs <= 0) return null;
    if (inline.endsWith("%")) {
      const n = parseFloat(inline);
      return Number.isFinite(n) ? n / 100 : null;
    }
    if (inline.endsWith("px")) {
      const n = parseFloat(inline);
      return Number.isFinite(n) ? n / fs : null;
    }
    if (inline.endsWith("em")) {
      const n = parseFloat(inline);
      return Number.isFinite(n) ? n : null;
    }
    if (inline.endsWith("rem")) {
      const n = parseFloat(inline);
      if (!Number.isFinite(n)) return null;
      const rootFs = parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16;
      return (n * rootFs) / fs;
    }
    const unitless = parseFloat(inline);
    return Number.isFinite(unitless) ? unitless : null;
  }

  private resolveRichBlockLineSpacingKey(block: HTMLElement): "__default__" | "__custom__" | string {
    const inline = (block.style.lineHeight || "").trim();
    if (!inline) return "__default__";
    const factor = this.parseRichLineHeightToFactor(block, inline);
    if (factor == null) return "__custom__";
    for (const p of RICH_LINE_SPACINGS) {
      if (Math.abs(factor - parseFloat(p)) < 0.061) return p;
    }
    return "__custom__";
  }

  /** 与 getSelectedRichBlocks 一致：光标折叠时为当前块；多段落选区一致时才返回预设键 */
  private getRichLineSpacingActiveKey(): "default" | string | null {
    if (!this.richEditorEl) return null;
    const blocks = this.getSelectedRichBlocks();
    if (!blocks.length) return null;
    const keys = new Set(blocks.map((b) => this.resolveRichBlockLineSpacingKey(b)));
    if (keys.size > 1) return null;
    const only = [...keys][0];
    if (only === "__custom__") return null;
    if (only === "__default__") return "default";
    return only;
  }

  private refreshRichLineSpacingPanelIfOpen(): void {
    const panel = this.richLineSpacingPanelEl;
    if (!panel?.hasClass("is-open")) return;
    const active = this.getRichLineSpacingActiveKey();
    panel.querySelectorAll("[data-yori-line-spacing]").forEach((el) => {
      const btn = el as HTMLElement;
      const key = btn.getAttribute("data-yori-line-spacing");
      btn.toggleClass("is-active", key != null && key === active);
    });
  }

  private syncRichLineSpacingToolbarState(): void {
    if (this.settings.toolbarMode !== "rich") return;
    const btn = this.richLineSpacingMainBtnEl;
    if (!btn || !this.richEditorEl) return;
    btn.setAttr("aria-label", toolbarCommandLabel(this.uiLang(), "rich-line-spacing"));
    btn.removeAttribute("title");
    this.refreshRichLineSpacingPanelIfOpen();
  }

  private applyRichLineSpacing(lineHeight: string | null): void {
    const blocks = this.getSelectedRichBlocks();
    if (!blocks.length) {
      new Notice("请先选中段落后再设置行间距。");
      return;
    }
    this.rememberRichStateForUndo();
    blocks.forEach((block) => {
      if (!lineHeight) {
        block.style.removeProperty("line-height");
      } else {
        block.style.lineHeight = lineHeight;
      }
    });
    this.markRichDirty();
    this.scheduleRichAutoSave();
    this.syncRichLineSpacingToolbarState();
  }

  private cycleRichAlignmentFromCurrent(): void {
    const next = (this.richAlignCurrentIndex + 1) % RICH_ALIGN_STEPS.length;
    this.runRichCommand(RICH_ALIGN_STEPS[next].cmd);
    this.richAlignCurrentIndex = next;
    this.syncRichAlignButtonBySelection();
  }

  private getCurrentRichAlignBlock(): HTMLElement | null {
    if (!this.richEditorEl) return null;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);
    if (!this.richEditorEl.contains(range.startContainer) || !this.richEditorEl.contains(range.endContainer)) {
      return null;
    }
    if (range.startContainer === this.richEditorEl && this.richEditorEl.childNodes.length > 0) {
      const startOffset = Math.max(0, Math.min(range.startOffset, this.richEditorEl.childNodes.length));
      const childAt = this.richEditorEl.childNodes.item(startOffset) ?? null;
      const childBefore = this.richEditorEl.childNodes.item(Math.max(0, startOffset - 1)) ?? null;
      const fromChild = this.findClosestRichBlock(childAt ?? childBefore);
      if (fromChild && fromChild !== this.richEditorEl) return fromChild;
    }
    const direct = this.findClosestRichBlock(range.startContainer);
    if (direct && direct !== this.richEditorEl) return direct;
    const block = this.getRichCaretBlockElement(range);
    if (!block || !this.richEditorEl.contains(block)) return null;
    if (block === this.richEditorEl) return null;
    return block;
  }

  private resolveRichAlignIndexFromBlock(block: HTMLElement): number {
    if (!this.richEditorEl) return 0;
    let current: HTMLElement | null = block;
    while (current && current !== this.richEditorEl) {
      const inlineAlign = (current.style.textAlign || "").toLowerCase().trim();
      if (inlineAlign.includes("center")) return 1;
      if (inlineAlign.includes("right") || inlineAlign.includes("end")) return 2;
      if (inlineAlign.includes("left") || inlineAlign.includes("start")) return 0;
      const legacyAlign = (current.getAttribute("align") || "").toLowerCase().trim();
      if (legacyAlign.includes("center")) return 1;
      if (legacyAlign.includes("right") || legacyAlign.includes("end")) return 2;
      if (legacyAlign.includes("left") || legacyAlign.includes("start")) return 0;
      current = current.parentElement;
    }
    const computed = (window.getComputedStyle(block).textAlign || "").toLowerCase().trim();
    if (computed.includes("center")) return 1;
    if (computed.includes("right") || computed.includes("end")) return 2;
    return 0;
  }

  private getRichCaretContextNode(range: Range): Node | null {
    const container = range.startContainer;
    if (!(container instanceof Element)) return container;
    const offset = range.startOffset;
    const childAt = container.childNodes.item(offset) ?? null;
    const childBefore = container.childNodes.item(Math.max(0, offset - 1)) ?? null;
    return childBefore ?? childAt ?? container;
  }

  private getRichCaretBlockElement(range: Range): HTMLElement | null {
    if (!this.richEditorEl) return null;
    const contextNode = this.getRichCaretContextNode(range);
    if (!contextNode) return null;
    let current: Node | null = contextNode instanceof Element ? contextNode : contextNode.parentNode;
    const blockSelector = "p,div,li,blockquote,h1,h2,h3,h4,h5,h6,td,th";
    while (current && current !== this.richEditorEl) {
      if (current instanceof HTMLElement && current.matches(blockSelector)) {
        return current;
      }
      current = current.parentNode;
    }
    const fallback = contextNode instanceof HTMLElement ? contextNode : contextNode.parentElement;
    if (!fallback || fallback === this.richEditorEl) return null;
    return this.richEditorEl.contains(fallback) ? fallback : null;
  }

  private syncRichAlignButtonBySelection(): void {
    if (!this.richAlignCycleBtnEl) return;
    const lang = this.uiLang();
    const al = richAlignToolbarStrings(lang);
    const step = RICH_ALIGN_STEPS[this.richAlignCurrentIndex];
    const sLab = richAlignStepLabel(lang, step.cmd);
    setIcon(this.richAlignCycleBtnEl, step.icon);
    this.richAlignCycleBtnEl.setAttr("title", `${al.titlePrefix}${sLab}`);
    this.richAlignCycleBtnEl.setAttr("aria-label", al.ariaCurrent(sLab));
  }

  private refreshRichAlignStateFromSelection(): void {
    const block = this.getCurrentRichAlignBlock();
    if (!block) return;
    const nextIndex = this.resolveRichAlignIndexFromBlock(block);
    this.richAlignCurrentIndex = nextIndex;
  }

  private toggleRichParagraphBorder(): void {
    this.applyRichParagraphBorder(RICH_BORDER_MAIN_WIDTH, RICH_BORDER_DEFAULT_COLOR);
  }

  /** 段落边框不可用于表格单元格、列表项（避免破坏表格/列表结构）。 */
  private canApplyRichParagraphBorderToBlock(block: HTMLElement): boolean {
    if (!this.richEditorEl || !this.richEditorEl.contains(block)) return false;
    if (block === this.richEditorEl) return false;
    if (block.closest("td, th, li")) return false;
    return true;
  }

  private wrapRichBlockInBorderFrame(block: HTMLElement): HTMLElement {
    const div = document.createElement("div");
    div.classList.add(YORI_RICH_BORDERED_CLASS);
    block.style.removeProperty("border");
    block.style.removeProperty("padding");
    block.style.removeProperty("border-radius");
    const parent = block.parentNode;
    if (parent) {
      parent.insertBefore(div, block);
      div.appendChild(block);
    }
    return div;
  }

  private unwrapRichBorderWrapper(wrapper: HTMLElement): void {
    const parent = wrapper.parentNode;
    if (!parent || !this.richEditorEl?.contains(wrapper)) return;
    while (wrapper.firstChild) {
      parent.insertBefore(wrapper.firstChild, wrapper);
    }
    parent.removeChild(wrapper);
  }

  /**
   * 将选区映射到 `.yori-rich-bordered`；同一父节点下连续选中的多个块合并为**一个**外框。
   */
  private collectRichBorderWrappersForSelection(createIfMissing: boolean): HTMLElement[] {
    if (!this.richEditorEl) return [];
    const raw = this.getSelectedRichBlocks().filter((b) => this.canApplyRichParagraphBorderToBlock(b));
    if (!raw.length) return [];

    const wrappers = new Set<HTMLElement>();
    const bare: HTMLElement[] = [];

    for (const block of raw) {
      if (block.classList.contains(YORI_RICH_BORDERED_CLASS)) {
        wrappers.add(block);
      } else {
        const inner = block.closest(`.${YORI_RICH_BORDERED_CLASS}`) as HTMLElement | null;
        if (inner && this.richEditorEl.contains(inner)) {
          wrappers.add(inner);
        } else {
          bare.push(block);
        }
      }
    }

    if (createIfMissing && bare.length > 0) {
      const bareUnique = [...new Set(bare)];
      const newWrappers = this.mergeBareBlocksIntoSingleWrappers(bareUnique);
      newWrappers.forEach((w) => wrappers.add(w));
    }

    return Array.from(wrappers);
  }

  private mergeBareBlocksIntoSingleWrappers(bareBlocks: HTMLElement[]): HTMLElement[] {
    if (!bareBlocks.length) return [];
    const byParent = new Map<Node, HTMLElement[]>();
    for (const b of bareBlocks) {
      const p = b.parentNode;
      if (!p) continue;
      if (!byParent.has(p)) byParent.set(p, []);
      byParent.get(p)!.push(b);
    }
    const out: HTMLElement[] = [];
    byParent.forEach((group) => {
      out.push(...this.wrapContiguousBlockRunsOnParent(group));
    });
    return out;
  }

  private wrapContiguousBlockRunsOnParent(blocks: HTMLElement[]): HTMLElement[] {
    const unique = [...new Set(blocks)];
    const parent = unique[0]?.parentNode;
    if (!parent) {
      return unique.map((b) => this.wrapRichBlockInBorderFrame(b));
    }
    const children = Array.from(parent.children) as HTMLElement[];
    const sorted = [...unique].sort((a, b) => children.indexOf(a) - children.indexOf(b));
    const runs: HTMLElement[][] = [];
    let run: HTMLElement[] = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
      const prevI = children.indexOf(sorted[i - 1]);
      const curI = children.indexOf(sorted[i]);
      if (curI === prevI + 1) {
        run.push(sorted[i]);
      } else {
        runs.push(run);
        run = [sorted[i]];
      }
    }
    runs.push(run);
    return runs.map((r) => this.wrapSiblingRunInBorderFrame(parent, r));
  }

  private wrapSiblingRunInBorderFrame(parent: Node, run: HTMLElement[]): HTMLElement {
    const div = document.createElement("div");
    div.classList.add(YORI_RICH_BORDERED_CLASS);
    const first = run[0];
    for (const b of run) {
      b.style.removeProperty("border");
      b.style.removeProperty("padding");
      b.style.removeProperty("border-radius");
    }
    parent.insertBefore(div, first);
    for (const b of run) {
      div.appendChild(b);
    }
    return div;
  }

  private applyRichParagraphBorder(width: string, color: string): void {
    if (!this.richEditorEl) {
      new Notice("请先进入高级编辑模式。");
      return;
    }
    this.rememberRichStateForUndo(true);
    const targets = this.collectRichBorderWrappersForSelection(true);
    if (!targets.length) {
      new Notice("请先选中段落后再添加边框（表格单元格、列表项内不可用）。");
      return;
    }
    targets.forEach((w) => {
      w.classList.add(YORI_RICH_BORDERED_CLASS);
      w.style.border = `${width} solid ${color}`;
    });
    this.markRichDirty();
    this.scheduleRichAutoSave();
    this.ensureRichTrailingParagraph();
    this.refreshRichBorderPanelIfOpen();
  }

  /** 仅改边框颜色；无容器则按 1px 实线创建容器。 */
  private applyRichParagraphBorderColor(color: string): void {
    if (!this.richEditorEl) {
      new Notice("请先进入高级编辑模式。");
      return;
    }
    this.rememberRichStateForUndo(true);
    const targets = this.collectRichBorderWrappersForSelection(true);
    if (!targets.length) {
      new Notice("请先选中段落后再设置边框颜色（表格单元格、列表项内不可用）。");
      return;
    }
    targets.forEach((w) => {
      w.classList.add(YORI_RICH_BORDERED_CLASS);
      const bw = parseFloat(window.getComputedStyle(w).borderTopWidth || "0");
      if (bw <= 0) {
        w.style.border = `1px solid ${color}`;
      } else {
        w.style.borderColor = color;
      }
    });
    this.markRichDirty();
    this.scheduleRichAutoSave();
    this.ensureRichTrailingParagraph();
    this.refreshRichBorderPanelIfOpen();
  }

  private clearRichParagraphBorder(): void {
    if (!this.richEditorEl) {
      new Notice("请先进入高级编辑模式。");
      return;
    }
    this.rememberRichStateForUndo(true);
    const blocks = this.getSelectedRichBlocks();
    if (!blocks.length) {
      new Notice("请先选中段落后再清除边框。");
      return;
    }
    const wrappers = new Set<HTMLElement>();
    for (const block of blocks) {
      if (block === this.richEditorEl) continue;
      if (block.classList.contains(YORI_RICH_BORDERED_CLASS)) {
        wrappers.add(block);
        continue;
      }
      const wrap = block.closest(`.${YORI_RICH_BORDERED_CLASS}`) as HTMLElement | null;
      if (wrap && this.richEditorEl.contains(wrap)) wrappers.add(wrap);
    }
    if (wrappers.size > 0) {
      wrappers.forEach((w) => this.unwrapRichBorderWrapper(w));
    } else {
      blocks.forEach((block) => {
        if (!this.canApplyRichParagraphBorderToBlock(block)) return;
        block.style.removeProperty("border");
        block.style.removeProperty("border-color");
        block.style.removeProperty("padding");
        block.style.removeProperty("border-radius");
      });
    }
    this.markRichDirty();
    this.scheduleRichAutoSave();
    this.ensureRichTrailingParagraph();
    this.refreshRichBorderPanelIfOpen();
  }

  /** 旧版笔记中行内 padding/radius 会盖过样式表；加载后剥掉，由 CSS 统一内外边距。 */
  private normalizeRichBorderedFramesAfterLoad(): void {
    if (!this.richEditorEl) return;
    this.richEditorEl.querySelectorAll(`.${YORI_RICH_BORDERED_CLASS}`).forEach((node) => {
      const el = node as HTMLElement;
      el.style.removeProperty("padding");
      el.style.removeProperty("border-radius");
    });
  }

  private normalizeRichTaskListClassesAfterLoad(): boolean {
    return normalizeRichTaskListDom(this.richEditorEl);
  }

  private isUsableRichDocumentSuffix(el: Element | null): boolean {
    return el instanceof HTMLElement && el.tagName === "P";
  }

  /** 末尾仅用于点击落光标的占位段（<p><br></p> 等），其布局高度可能异常，不参与「内容底边」计算。 */
  private isEmptyRichTrailingParagraph(p: HTMLElement): boolean {
    const kids = Array.from(p.childNodes);
    if (kids.length === 0) return true;
    if (
      kids.length === 1 &&
      kids[0].nodeType === Node.TEXT_NODE &&
      !(kids[0].textContent || "").trim()
    ) {
      return true;
    }
    if (kids.length === 1 && kids[0].nodeName === "BR") return true;
    if (
      kids.length === 2 &&
      kids[0].nodeType === Node.TEXT_NODE &&
      !(kids[0].textContent || "").trim() &&
      kids[1].nodeName === "BR"
    ) {
      return true;
    }
    return false;
  }

  /** 保证末尾有可编辑的段落，避免表格/边框块占最后一项时无法在下方落光标。 */
  private ensureRichTrailingParagraph(): void {
    if (!this.richEditorEl) return;
    const last = this.richEditorEl.lastElementChild;
    if (this.isUsableRichDocumentSuffix(last)) return;
    const p = document.createElement("p");
    p.innerHTML = "<br>";
    this.richEditorEl.appendChild(p);
  }

  private placeCaretAtEndOfElement(el: HTMLElement): void {
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    if (!sel) return;
    sel.removeAllRanges();
    sel.addRange(range);
  }

  /**
   * 在「所有块级子元素」底边之下的区域点击（含外包层 padding）时，保证尾部有 p 并把光标落入其中。
   * 计算内容底边时忽略仅含 br 的占位尾段，避免其布局高度拉满导致永不该判定为「下方空白」。
   */
  private tryPlaceRichCaretBelowAllBlocks(evt: MouseEvent): boolean {
    if (!this.richEditorEl || !this.richEditorWrapEl || evt.button !== 0) return false;
    const t = richPointerTargetElement(evt);
    if (getClosestRichTableCellFromTarget(evt.target)) return false;

    const wrapRect = this.richEditorWrapEl.getBoundingClientRect();
    if (evt.clientX > wrapRect.right - 22) return false;

    this.ensureRichTrailingParagraph();

    const children = Array.from(this.richEditorEl.children) as HTMLElement[];
    if (!children.length) return false;

    const lastEl = children[children.length - 1];
    const omitLastForDepth =
      lastEl.tagName === "P" &&
      lastEl === this.richEditorEl.lastElementChild &&
      this.isEmptyRichTrailingParagraph(lastEl);
    const depthEls = omitLastForDepth ? children.slice(0, -1) : children;

    let contentBottom = 0;
    if (depthEls.length) {
      for (const el of depthEls) {
        const r = el.getBoundingClientRect();
        contentBottom = Math.max(contentBottom, r.bottom);
      }
    } else {
      contentBottom = lastEl.getBoundingClientRect().top;
    }

    const slop = 10;
    if (evt.clientY <= contentBottom + slop) return false;

    const tail = this.richEditorEl.lastElementChild as HTMLElement | null;
    if (!tail || tail.tagName !== "P") return false;

    evt.preventDefault();
    this.richEditorEl.focus();
    const tailEl = tail;
    window.requestAnimationFrame(() => {
      if (!this.richEditorEl?.contains(tailEl)) return;
      this.placeCaretAtEndOfElement(tailEl);
    });
    return true;
  }

  /**
   * 删除末段后只剩边框块、光标仍吸在框尾时，将折叠选区移到其后的保留段落末尾，避免退格/删除继续吃进框内。
   */
  private normalizeRichCaretAfterBorderDelete(): void {
    if (!this.richEditorEl) return;
    const last = this.richEditorEl.lastElementChild as HTMLElement | null;
    const bordered = last?.previousElementSibling as HTMLElement | null;
    if (!last || last.tagName !== "P" || !bordered?.classList.contains(YORI_RICH_BORDERED_CLASS)) return;

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return;

    const range = sel.getRangeAt(0);
    if (!bordered.contains(range.startContainer)) return;

    const atBlockEnd = document.createRange();
    atBlockEnd.selectNodeContents(bordered);
    atBlockEnd.collapse(false);
    if (range.compareBoundaryPoints(Range.START_TO_START, atBlockEnd) < 0) return;

    const moveTo = document.createRange();
    moveTo.selectNodeContents(last);
    moveTo.collapse(false);
    sel.removeAllRanges();
    sel.addRange(moveTo);
  }

  /**
   * 新建表格行时继承参考单元格的块级外观（对齐、底色、边框、列宽等），
   * 编号/标记列内容仍由 applyRichTableColumnTypes 根据表头 yoriColType 统一处理。
   */
  private copyRichTableNewCellFormatFromReference(ref: HTMLTableCellElement, target: HTMLTableCellElement): void {
    target.style.cssText = ref.style.cssText;
    const align = ref.getAttribute("align");
    if (align) target.setAttribute("align", align);
    else target.removeAttribute("align");
  }

  private addRichTableRow(targetCell?: HTMLTableCellElement): void {
    if (!this.richEditorEl) return;
    const cell = targetCell ?? this.getCurrentRichTableCell();
    if (!cell) {
      new Notice(richNoticeStrings(this.uiLang()).cursorInCell);
      return;
    }
    const row = cell.parentElement as HTMLTableRowElement | null;
    if (!row) return;
    const table = row.closest("table");
    if (!table) return;

    const body = row.parentElement;
    const newRow = document.createElement("tr");
    const isHeaderRow =
      row.rowIndex === 0 ||
      !!row.closest("thead") ||
      Array.from(row.cells).every((c) => c.tagName === "TH");
    Array.from(row.cells).forEach((sourceCell, idx) => {
      const tag = isHeaderRow ? "td" : sourceCell.tagName === "TH" ? "th" : "td";
      const nextCell = document.createElement(tag);
      nextCell.innerHTML = tag === "th" ? `标题${idx + 1}` : "<br>";
      this.copyRichTableNewCellFormatFromReference(sourceCell, nextCell);
      newRow.appendChild(nextCell);
    });
    row.insertAdjacentElement("afterend", newRow);
    if (!body?.contains(newRow)) {
      table.appendChild(newRow);
    }
    const focusColIdx = Math.min(cell.cellIndex, newRow.cells.length - 1);
    this.applyRichTableColumnTypes(table);
    const focusCell = newRow.cells[focusColIdx] as HTMLTableCellElement | undefined;
    if (focusCell) {
      focusRichTableCell(this.richEditorEl, focusCell, "start");
      this.scheduleRichSelectionVisualSync();
    }
    this.markRichDirty();
    this.scheduleRichAutoSave();
  }

  private removeRichTableRow(targetCell?: HTMLTableCellElement): void {
    const cell = targetCell ?? this.getCurrentRichTableCell();
    if (!cell) {
      new Notice(richNoticeStrings(this.uiLang()).cursorInCell);
      return;
    }
    const row = cell.parentElement as HTMLTableRowElement | null;
    if (!row) return;
    const table = row.closest("table");
    if (!table) return;
    if (table.rows.length <= 1) {
      new Notice("表格至少保留一行。");
      return;
    }
    row.remove();
    this.applyRichTableColumnTypes(table);
    this.markRichDirty();
    this.scheduleRichAutoSave();
  }

  private addRichTableColumn(targetCell?: HTMLTableCellElement): void {
    const cell = targetCell ?? this.getCurrentRichTableCell();
    if (!cell) {
      new Notice(richNoticeStrings(this.uiLang()).cursorInCell);
      return;
    }
    const table = cell.closest("table");
    if (!table) return;
    const index = cell.cellIndex;
    Array.from(table.rows).forEach((row) => {
      const refCell = row.cells[index + 1] ?? null;
      const source = row.cells[index];
      const tag = source?.tagName === "TH" ? "th" : "td";
      const newCell = document.createElement(tag);
      newCell.innerHTML = tag === "th" ? "标题" : "<br>";
      row.insertBefore(newCell, refCell);
    });
    this.applyRichTableColumnTypes(table);
    this.syncRichTableLayoutAfterStructureChange(table);
    this.markRichDirty();
    this.scheduleRichAutoSave();
  }

  private removeRichTableColumn(targetCell?: HTMLTableCellElement): void {
    const cell = targetCell ?? this.getCurrentRichTableCell();
    if (!cell) {
      new Notice(richNoticeStrings(this.uiLang()).cursorInCell);
      return;
    }
    const table = cell.closest("table");
    if (!table) return;
    const index = cell.cellIndex;
    if ((table.rows[0]?.cells.length ?? 0) <= 1) {
      new Notice("表格至少保留一列。");
      return;
    }
    Array.from(table.rows).forEach((row) => {
      if (row.cells[index]) row.deleteCell(index);
    });
    this.applyRichTableColumnTypes(table);
    this.syncRichTableLayoutAfterStructureChange(table);
    this.markRichDirty();
    this.scheduleRichAutoSave();
  }

  private getRichTableCellsForBulkStyle(anchorCell: HTMLTableCellElement): HTMLTableCellElement[] {
    return getRichTableCellsForBulkStyleFromAnchor(anchorCell, (t) => this.getSelectedRichTableCells(t));
  }

  /** 与单元格背景批量设置相同：拖选 / 矩形选区内的全部单元格，用于文字色与高亮 */
  private getRichTableCellsForBulkTextStyle(): HTMLTableCellElement[] {
    return computeRichTableCellsForBulkTextStyle({
      richEditorEl: this.richEditorEl,
      tryGetCellsFromDragRectangle: () => this.tryGetRichTableCellsFromDragRectangle(),
      getCurrentRichTableCell: () => this.getCurrentRichTableCell(),
      getRichTableCellsForBulkStyle: (cell) => this.getRichTableCellsForBulkStyle(cell)
    });
  }

  /** 批量改 hiliteColor 时防止误伤单元格上的 background-color */
  private snapshotTableCellBackgroundsFromCells(cells: readonly HTMLTableCellElement[]): Map<HTMLElement, string> {
    const map = new Map<HTMLElement, string>();
    for (const cell of cells) {
      const bg = cell.style.backgroundColor;
      if (bg) map.set(cell, bg);
    }
    return map;
  }

  private restoreCaretToEndOfFirstTableCell(cells: readonly HTMLTableCellElement[]): void {
    if (cells.length === 0) return;
    const sel = window.getSelection();
    if (!sel) return;
    try {
      const range = document.createRange();
      range.selectNodeContents(cells[0]);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    } catch {
      /* ignore */
    }
  }

  /** 表格多格：execCommand 在 Obsidian/Electron 中常失效，改为直接写 DOM */
  private unwrapDomElement(el: Element): void {
    const parent = el.parentNode;
    if (!parent) return;
    while (el.firstChild) {
      parent.insertBefore(el.firstChild, el);
    }
    parent.removeChild(el);
  }

  private stripMarkTagsInCell(cell: HTMLTableCellElement): void {
    Array.from(cell.querySelectorAll("mark")).forEach((m) => this.unwrapDomElement(m));
  }

  private applyRichTextColorToCellsDom(cells: readonly HTMLTableCellElement[], color: string): void {
    for (const cell of cells) {
      cell.style.setProperty("color", color);
      cell.querySelectorAll<HTMLElement>("*").forEach((el) => {
        el.style.setProperty("color", color);
      });
    }
  }

  private clearRichTextColorInCellsDom(cells: readonly HTMLTableCellElement[]): void {
    for (const cell of cells) {
      cell.style.removeProperty("color");
      cell.querySelectorAll<HTMLElement>("*").forEach((el) => {
        el.style.removeProperty("color");
      });
    }
  }

  /** 用整格 <mark> 包裹内容，避免 hiliteColor/execCommand 在表格批量场景不生效 */
  private surroundCellContentsWithHighlightMark(cell: HTMLTableCellElement, color: string): void {
    this.stripMarkTagsInCell(cell);
    const range = document.createRange();
    range.selectNodeContents(cell);
    if (range.collapsed) {
      const mark = document.createElement("mark");
      mark.style.backgroundColor = color;
      // 浏览器默认样式 mark { color: black } 会盖住单元格/span 上的前景色
      mark.style.setProperty("color", "inherit");
      mark.appendChild(document.createElement("br"));
      cell.appendChild(mark);
      return;
    }
    const contents = range.extractContents();
    const mark = document.createElement("mark");
    mark.style.backgroundColor = color;
    mark.style.setProperty("color", "inherit");
    mark.appendChild(contents);
    cell.appendChild(mark);
  }

  /**
   * hiliteColor 常插入带默认 UA 样式的 <mark>（如 color: black），会盖住 foreColor。
   * 对选区相关的 mark 在未显式写 color 时改为继承，以保留文字颜色。
   */
  private fixRichHighlightMarkForegroundAfterHiliteCommand(): void {
    const sel = window.getSelection();
    if (!sel?.anchorNode) return;
    const start = sel.anchorNode instanceof Element ? sel.anchorNode : sel.anchorNode.parentElement;
    let el: HTMLElement | null = start?.closest("mark") ?? null;
    while (el) {
      if (!el.style.color) el.style.setProperty("color", "inherit");
      el = el.parentElement?.closest("mark") ?? null;
    }
  }

  private applyRichHighlightToCellsDom(cells: readonly HTMLTableCellElement[], color: string): void {
    const cellBgs = this.snapshotTableCellBackgroundsFromCells(cells);
    for (const cell of cells) {
      this.surroundCellContentsWithHighlightMark(cell, color);
    }
    this.restoreTableCellBackgrounds(cellBgs);
  }

  private clearRichHighlightInCellsDom(cells: readonly HTMLTableCellElement[]): void {
    for (const cell of cells) {
      this.stripMarkTagsInCell(cell);
    }
  }

  private clearRichInlineFormattingOnElement(el: HTMLElement): void {
    el.style.removeProperty("font-size");
    el.style.removeProperty("font-weight");
    el.style.removeProperty("font-style");
    el.style.removeProperty("color");
    el.style.removeProperty("background-color");
    el.style.removeProperty("text-decoration");
    el.style.removeProperty("text-decoration-line");
  }

  private clearRichFormattingInTableCells(cells: readonly HTMLTableCellElement[]): void {
    for (const cell of cells) {
      this.clearRichInlineFormattingOnElement(cell);
      cell.querySelectorAll<HTMLElement>("*").forEach((el) => this.clearRichInlineFormattingOnElement(el));
      Array.from(cell.querySelectorAll("mark, font, b, strong, i, em, u, s, strike")).forEach((el) =>
        this.unwrapDomElement(el)
      );
    }
  }

  private clearRichFormattingInRange(range: Range): void {
    if (!this.richEditorEl) return;
    const elements = Array.from(this.richEditorEl.querySelectorAll<HTMLElement>("*")).filter((el) => {
      try {
        return range.intersectsNode(el);
      } catch {
        return false;
      }
    });
    elements.forEach((el) => this.clearRichInlineFormattingOnElement(el));
    elements
      .filter((el) => /^(MARK|FONT|B|STRONG|I|EM|U|S|STRIKE)$/.test(el.tagName))
      .sort((a, b) => {
        const pa = a.compareDocumentPosition(b);
        if (pa & Node.DOCUMENT_POSITION_CONTAINED_BY) return -1;
        if (pa & Node.DOCUMENT_POSITION_CONTAINS) return 1;
        return 0;
      })
      .forEach((el) => this.unwrapDomElement(el));
  }

  private hasRichTextRangeSelection(): boolean {
    if (!this.richEditorEl) return false;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;
    return (
      !!sel.anchorNode &&
      !!sel.focusNode &&
      this.richEditorEl.contains(sel.anchorNode) &&
      this.richEditorEl.contains(sel.focusNode)
    );
  }

  private clearRichFormattingForSelectionOrCells(): void {
    if (!this.richEditorEl) return;
    const cells = this.getRichTableCellsForBulkTextStyle();
    const hasMultiCells = cells.length > 1;
    const hasTextSelection = this.hasRichTextRangeSelection();
    if (!hasMultiCells && !hasTextSelection) {
      new Notice("请先选中文字或多选表格单元格。");
      return;
    }
    this.rememberRichStateForUndo();
    this.richEditorEl.focus();
    if (hasMultiCells) {
      this.clearRichFormattingInTableCells(cells);
      this.restoreCaretToEndOfFirstTableCell(cells);
    } else {
      const sel = window.getSelection();
      if (sel?.rangeCount) {
        this.clearRichFormattingInRange(sel.getRangeAt(0));
      }
    }
    this.markRichDirty();
    this.scheduleRichAutoSave();
    this.scheduleRichSelectionVisualSync();
  }

  /** 高级编辑右键菜单：剪切 / 复制（依赖系统选区）。 */
  private richEditorExecCut(): void {
    if (!this.richEditorEl) return;
    this.richEditorEl.focus();
    try {
      document.execCommand("cut");
    } catch {
      /* ignore */
    }
    this.markRichDirty();
    this.scheduleRichAutoSave();
    this.scheduleRichSelectionVisualSync();
  }

  private richEditorExecCopy(): void {
    if (!this.richEditorEl) return;
    this.richEditorEl.focus();
    try {
      document.execCommand("copy");
    } catch {
      /* ignore */
    }
  }

  /**
   * 菜单触发粘贴：先试 execCommand；桌面端退回 Electron 读剪贴板文本再插入（否则菜单点击常无粘贴权限）。
   */
  private richEditorExecPaste(): void {
    if (!this.richEditorEl) return;
    this.richEditorEl.focus();
    try {
      if (document.execCommand("paste")) {
        this.scheduleRichEditorHydratePasses();
        this.markRichDirty();
        this.scheduleRichAutoSave();
        return;
      }
    } catch {
      /* fallthrough */
    }
    try {
      const req = (globalThis as unknown as { require?: (id: string) => { clipboard?: { readText?: () => string } } })
        .require;
      const text = req?.("electron")?.clipboard?.readText?.();
      if (typeof text !== "string") return;
      if (text.length > 0 && isBareHttpUrlPaste(text)) {
        this.runRichInsertHtml(richExternalLinkHtmlFromUrl(text));
        return;
      }
      this.rememberRichStateForUndo();
      document.execCommand("insertText", false, text);
      this.scheduleRichEditorHydratePasses();
      this.markRichDirty();
      this.scheduleRichAutoSave();
    } catch {
      new Notice(richNoticeStrings(this.uiLang()).pasteFailed);
    }
  }

  /** 正文右键菜单弹出时调用：此时选区仍在，点击菜单项后常被清空。 */
  private captureRichVaultLinkContextSnapshot(): void {
    const ed = this.richEditorEl;
    if (!ed) return;
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;
    const r = sel.getRangeAt(0);
    if (!ed.contains(r.commonAncestorContainer)) return;
    this.richVaultLinkContextRange = r.cloneRange();
  }

  /** 点击「插入内部链接」时：用右键瞬间的快照填充插入选区（菜单点击后当前 Selection 往往已丢）。 */
  private prepareRichVaultLinkInsertFromContextSnapshot(): void {
    this.clearRichVaultLinkInsertSnapshot();
    const ed = this.richEditorEl;
    const ctx = this.richVaultLinkContextRange;
    this.richVaultLinkContextRange = null;
    if (!ed || !ctx) return;
    try {
      if (
        ctx.startContainer.isConnected &&
        ctx.endContainer.isConnected &&
        ed.contains(ctx.commonAncestorContainer)
      ) {
        this.richVaultLinkSavedRange = ctx.cloneRange();
      }
    } catch {
      /* 选区已失效 */
    }
  }

  /** 正文区（非表格、非内嵌图）右键：清除格式、内部链接、剪贴板。 */
  private openRichEditorStandardContextMenu(evt: MouseEvent): void {
    this.captureRichVaultLinkContextSnapshot();
    const lang = this.uiLang();
    const bm = richBodyMenuStrings(lang);
    const menu = new Menu();
    const canCutCopy = this.hasRichTextRangeSelection();
    menu.addItem((item) =>
      item.setTitle(bm.clearFormatting).setIcon("eraser").onClick(() => this.clearRichFormattingForSelectionOrCells())
    );
    menu.addItem((item) =>
      item.setTitle(bm.insertInternalLink).setIcon("link").onClick(() => {
        this.prepareRichVaultLinkInsertFromContextSnapshot();
        this.openVaultLinkPicker("rich", null);
      })
    );
    menu.addItem((item) =>
      item.setTitle(bm.insertNoteTag).setIcon("tag").onClick(() => {
        this.captureRichCaretForTagInsert();
        openRichTagInsertModal(this.app, this.makeRichTagInsertHost(), lang);
      })
    );
    menu.addSeparator();
    menu.addItem((item) =>
      item
        .setTitle(bm.cut)
        .setIcon("scissors")
        .setDisabled(!canCutCopy)
        .onClick(() => {
          if (!this.hasRichTextRangeSelection()) return;
          this.richEditorExecCut();
        })
    );
    menu.addItem((item) =>
      item
        .setTitle(bm.copy)
        .setIcon("copy")
        .setDisabled(!canCutCopy)
        .onClick(() => {
          if (!this.hasRichTextRangeSelection()) return;
          this.richEditorExecCopy();
        })
    );
    menu.addItem((item) =>
      item.setTitle(bm.paste).setIcon("clipboard-paste").onClick(() => this.richEditorExecPaste())
    );
    menu.showAtMouseEvent(evt);
  }

  private makeRichTagInsertHost(): RichTagInsertHost {
    return {
      restoreCaretForTagInsert: () => this.restoreRichCaretForTagInsert(),
      insertRichPlainAtCaret: (t, o) => this.insertRichPlainAtCaret(t, o),
      scheduleRichEditorHydratePasses: () => this.scheduleRichEditorHydratePasses(),
      clearTagInsertCaretSnapshot: () => this.clearRichTagInsertCaretSnapshot()
    };
  }

  private captureRichCaretForTagInsert(): void {
    this.richTagInsertSavedRange = null;
    const ed = this.richEditorEl;
    if (!ed) return;
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;
    const r = sel.getRangeAt(0);
    if (!ed.contains(r.commonAncestorContainer)) return;
    this.richTagInsertSavedRange = r.cloneRange();
  }

  private restoreRichCaretForTagInsert(): void {
    const ed = this.richEditorEl;
    const r = this.richTagInsertSavedRange;
    if (!ed || !r) return;
    try {
      const sel = window.getSelection();
      if (!sel) return;
      sel.removeAllRanges();
      sel.addRange(r);
      ed.focus({ preventScroll: true });
    } catch {
      /* 选区已失效 */
    }
  }

  private clearRichTagInsertCaretSnapshot(): void {
    this.richTagInsertSavedRange = null;
  }

  private captureRichCaretForVaultLinkInsert(): void {
    const ed = this.richEditorEl;
    if (!ed) return;
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;
    const r = sel.getRangeAt(0);
    if (!ed.contains(r.commonAncestorContainer)) return;
    this.richVaultLinkSavedRange = r.cloneRange();
  }

  private restoreRichVaultLinkInsertSnapshot(): void {
    const ed = this.richEditorEl;
    const r = this.richVaultLinkSavedRange;
    if (!ed || !r) return;
    try {
      const sel = window.getSelection();
      if (!sel) return;
      sel.removeAllRanges();
      sel.addRange(r);
      ed.focus({ preventScroll: true });
    } catch {
      /* 选区已失效 */
    }
  }

  private clearRichVaultLinkInsertSnapshot(): void {
    this.richVaultLinkSavedRange = null;
  }

  private getUnifiedCellBackgroundForColorUI(anchorCell: HTMLTableCellElement): string {
    const cells = this.getRichTableCellsForBulkStyle(anchorCell);
    if (cells.length === 0) return "";
    const normalizeBg = (value: string): string => {
      const v = (value || "").trim();
      if (!v || v === "transparent" || v === "rgba(0, 0, 0, 0)") return "";
      const probe = document.createElement("span");
      probe.style.backgroundColor = v;
      document.body.appendChild(probe);
      const n = (window.getComputedStyle(probe).backgroundColor || "").replace(/\s+/g, "").toLowerCase();
      probe.remove();
      return n;
    };
    const raw = cells.map((c) => {
      const inline = (c.style.backgroundColor || "").trim();
      if (inline) return inline;
      return window.getComputedStyle(c).backgroundColor || "";
    });
    const firstNorm = normalizeBg(raw[0] ?? "");
    if (!firstNorm) return "";
    if (!raw.every((r) => normalizeBg(r) === firstNorm)) return "";
    return raw[0] ?? "";
  }

  private applyRichTableCellBackground(color: string | null, targetCell?: HTMLTableCellElement): void {
    const anchor = targetCell ?? this.getCurrentRichTableCell();
    if (!anchor) {
      new Notice(richNoticeStrings(this.uiLang()).cursorInCell);
      return;
    }
    this.rememberRichStateForUndo();
    const cells = this.getRichTableCellsForBulkStyle(anchor);
    cells.forEach((cell) => {
      if (!color) {
        cell.style.removeProperty("background-color");
      } else {
        cell.style.backgroundColor = color;
      }
    });
    this.markRichDirty();
    this.scheduleRichAutoSave();
  }

  private applyRichTableBorder(width: string, color: string, targetCell?: HTMLTableCellElement): void {
    const table = this.getCurrentRichTable(targetCell);
    if (!table) {
      new Notice(richNoticeStrings(this.uiLang()).cursorInTable);
      return;
    }
    this.rememberRichStateForUndo();
    const cells = table.querySelectorAll("th, td");
    cells.forEach((cell) => {
      (cell as HTMLElement).style.border = `${width} solid ${color}`;
    });
    this.markRichDirty();
    this.scheduleRichAutoSave();
  }

  private clearRichTableBorder(targetCell?: HTMLTableCellElement): void {
    const table = this.getCurrentRichTable(targetCell);
    if (!table) {
      new Notice(richNoticeStrings(this.uiLang()).cursorInTable);
      return;
    }
    this.rememberRichStateForUndo();
    table.querySelectorAll("th, td").forEach((cell) => {
      (cell as HTMLElement).style.removeProperty("border");
    });
    this.markRichDirty();
    this.scheduleRichAutoSave();
  }

  /** 表格单元格边框线宽是否命中预设（用于右键菜单 ✓）。 */
  private resolveRichTableCellBorderWidthPresetKey(el: HTMLElement): string | null {
    const bw = parseFloat(window.getComputedStyle(el).borderTopWidth || "0");
    if (!Number.isFinite(bw) || bw <= 0) return null;
    for (const p of RICH_BORDER_WIDTH_PRESETS) {
      const pw = parseFloat(p.width);
      if (Math.abs(bw - pw) < 0.99) return p.width;
    }
    return null;
  }

  /** 整张表各格边框线宽均为同一预设时返回该 key，否则 null。 */
  private getRichTableActiveBorderWidthKey(table: HTMLTableElement): string | null {
    const cells = table.querySelectorAll("th, td");
    if (!cells.length) return null;
    const keys = new Set(
      Array.from(cells, (c) => this.resolveRichTableCellBorderWidthPresetKey(c as HTMLElement))
    );
    if (keys.size !== 1) return null;
    const only = [...keys][0];
    return only ?? null;
  }

  /** 改表格边框颜色时保留当前线宽（无或非数值则默认主预设）。 */
  private getRichTableBorderWidthTokenForApply(table: HTMLTableElement): string {
    const first = table.querySelector("th, td") as HTMLElement | null;
    if (!first) return RICH_BORDER_MAIN_WIDTH;
    const w = window.getComputedStyle(first).borderTopWidth;
    const n = parseFloat(w || "0");
    if (!Number.isFinite(n) || n <= 0) return RICH_BORDER_MAIN_WIDTH;
    if (Math.abs(n - Math.round(n)) < 0.01) return `${Math.round(n)}px`;
    return `${n}px`;
  }

  /** 仅改整张表边框线宽，颜色取首格的解析结果（与段落边框逻辑类似）。 */
  private applyRichTableBorderWidth(width: string, targetCell?: HTMLTableCellElement): void {
    const table = this.getCurrentRichTable(targetCell);
    if (!table) {
      new Notice(richNoticeStrings(this.uiLang()).cursorInTable);
      return;
    }
    const first = table.querySelector("th, td") as HTMLElement | null;
    const color = first ? this.getRichBorderFrameResolvedColorHex(first) : RICH_BORDER_DEFAULT_COLOR;
    this.rememberRichStateForUndo();
    table.querySelectorAll("th, td").forEach((c) => {
      (c as HTMLElement).style.border = `${width} solid ${color}`;
    });
    this.markRichDirty();
    this.scheduleRichAutoSave();
  }

  private async applyRichTableCellBackgroundCustom(targetCell?: HTMLTableCellElement): Promise<void> {
    const color = await this.pickColorWithModal(pickColorModalStrings(this.uiLang()).cellBackgroundColor, "#efe8e0");
    if (!color) return;
    this.applyRichTableCellBackground(color, targetCell);
  }

  private async applyRichTableBorderCustom(targetCell?: HTMLTableCellElement): Promise<void> {
    const table = this.getCurrentRichTable(targetCell);
    const color = await this.pickColorWithModal(pickColorModalStrings(this.uiLang()).tableBorderColor, "#af9165");
    if (!color) return;
    const w = table ? this.getRichTableBorderWidthTokenForApply(table) : RICH_BORDER_MAIN_WIDTH;
    this.applyRichTableBorder(w, color, targetCell);
  }

  private getCurrentRichTableCell(): HTMLTableCellElement | null {
    return getCurrentRichTableCellFromEditor({
      richEditorRoot: this.richEditorEl,
      contextCell: this.richContextCell,
      dragAnchorCell: this.richDragAnchorCell,
      dragFocusCell: this.richDragFocusCell,
    });
  }

  private getCurrentRichTable(targetCell?: HTMLTableCellElement): HTMLTableElement | null {
    const cell = targetCell ?? this.getCurrentRichTableCell();
    if (!cell) return null;
    const table = cell.closest("table");
    return table as HTMLTableElement | null;
  }

  private handleRichEditorContextMenu(evt: MouseEvent): void {
    if (!this.richEditorEl) return;
    const t = richPointerTargetElement(evt);
    const img =
      t?.closest?.("img[data-yori-image-embed]") instanceof HTMLImageElement
        ? (t.closest("img[data-yori-image-embed]") as HTMLImageElement)
        : null;
    if (img && this.richEditorEl.contains(img)) {
      return;
    }

    const cell = t?.closest("td, th") as HTMLTableCellElement | null;
    if (!cell || !this.richEditorEl.contains(cell)) {
      this.closeRichTableContextMenu();
      evt.preventDefault();
      this.openRichEditorStandardContextMenu(evt);
      return;
    }
    evt.preventDefault();
    this.richContextCell = cell;
    this.openRichTableContextMenu(evt.clientX, evt.clientY, cell);
  }

  private openRichTableContextMenu(x: number, y: number, cell: HTMLTableCellElement): void {
    this.closeRichTableContextMenu();
    const menu = createDiv({ cls: "yori-rich-table-context-menu" });
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    const lang = this.uiLang();
    const tm = richTableMenuStrings(lang);

    const addItem = (
      label: string,
      run: () => void,
      danger = false,
      host: HTMLElement = menu,
      disabled = false
    ): void => {
      const btn = host.createEl("button", { cls: "yori-rich-table-context-item", text: label });
      if (danger) btn.addClass("is-danger");
      if (disabled) {
        btn.disabled = true;
        btn.addClass("is-disabled");
      }
      btn.addEventListener("mousedown", (evt) => evt.preventDefault());
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        run();
        this.closeRichTableContextMenu();
      });
    };
    const addDivider = (host: HTMLElement = menu): void => {
      host.createDiv({ cls: "yori-rich-table-context-divider" });
    };

    const closeAllRichTableSubmenus = (): void => {
      menu.querySelectorAll(".yori-rich-table-context-submenu.is-open").forEach((el) => el.removeClass("is-open"));
    };

    menu.addEventListener("mouseover", (evt) => {
      const raw = evt.target;
      if (!(raw instanceof Element)) return;
      if (raw.closest(".yori-rich-table-context-submenu")) return;
      closeAllRichTableSubmenus();
    });

    const addSubmenu = (
      label: string,
      build: (panel: HTMLElement, addSubItem: (subLabel: string, run: () => void, danger?: boolean) => void) => void
    ): void => {
      const wrap = menu.createDiv({ cls: "yori-rich-table-context-submenu" });
      const trigger = wrap.createEl("button", { cls: "yori-rich-table-context-item is-submenu", text: label });
      trigger.createSpan({ cls: "yori-rich-table-context-submenu-arrow", text: ">" });
      const panel = wrap.createDiv({ cls: "yori-rich-table-context-submenu-panel" });
      const addSubItem = (subLabel: string, run: () => void, danger = false): void => {
        addItem(subLabel, run, danger, panel);
      };
      build(panel, addSubItem);
      trigger.addEventListener("mousedown", (evt) => evt.preventDefault());
      trigger.addEventListener("click", (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        menu.querySelectorAll(".yori-rich-table-context-submenu.is-open").forEach((el) => {
          if (el !== wrap) el.removeClass("is-open");
        });
        wrap.toggleClass("is-open", !wrap.hasClass("is-open"));
      });
      trigger.addEventListener("mouseenter", () => {
        menu.querySelectorAll(".yori-rich-table-context-submenu.is-open").forEach((el) => {
          if (el !== wrap) el.removeClass("is-open");
        });
        wrap.addClass("is-open");
      });
    };
    const normalizeColor = (value: string): string => {
      const probe = document.createElement("span");
      probe.style.color = value;
      document.body.appendChild(probe);
      const normalized = (window.getComputedStyle(probe).color || "").replace(/\s+/g, "").toLowerCase();
      probe.remove();
      return normalized;
    };
    const addColorGrid = (
      panel: HTMLElement,
      selectedRawColor: string,
      applyColor: (color: string) => void,
      clearColor: () => void,
      customColor: () => void
    ): void => {
      const selectedColor = normalizeColor(selectedRawColor || "");
      const grid = panel.createDiv({ cls: "yori-rich-table-color-grid" });
      RICH_COLOR_GRID_HUE_ROWS.forEach((row) => {
        const rowEl = grid.createDiv({ cls: "yori-rich-table-color-row" });
        row.forEach((color) => {
          const swatch = rowEl.createEl("button", {
            cls: "yori-rich-table-color-swatch",
            attr: {
              "aria-label": tm.ariaPickColor(color),
              title: color
            }
          });
          swatch.style.backgroundColor = color;
          if (selectedColor && normalizeColor(color) === selectedColor) {
            swatch.addClass("is-active");
          }
          swatch.addEventListener("mousedown", (evt) => evt.preventDefault());
          swatch.addEventListener("click", () => {
            applyColor(color);
            this.closeRichTableContextMenu();
          });
        });
      });
      addDivider(panel);
      addItem(tm.clearCellColor, () => clearColor(), false, panel);
      addItem(tm.customColor, () => customColor(), false, panel);
    };

    const table = this.getCurrentRichTable(cell);
    const selectedCount = table ? this.getSelectedRichTableCells(table).length : 0;
    const showMergeCells = selectedCount > 1;
    const showSplitCell = Math.max(cell.colSpan, cell.rowSpan) > 1;
    const colIndex = table ? this.resolveRichTableColumnIndex(table, cell) : -1;
    const headerCellForCol = table && colIndex >= 0 ? getOriginCellByGridPosition(table, 0, colIndex) : null;
    const colType = headerCellForCol?.dataset.yoriColType ?? "";
    const showConvertToNumbered = colType !== "numbered";
    const showConvertToMarked = colType !== "marked";
    const showRestoreNormalColumn = colType === "numbered" || colType === "marked";

    const sampleBorderCell = (table?.querySelector("th, td") as HTMLElement | null) ?? cell;

    addSubmenu(tm.backgroundColor, (panel) => {
      addColorGrid(
        panel,
        this.getUnifiedCellBackgroundForColorUI(cell),
        (color) => this.applyRichTableCellBackground(color, cell),
        () => this.applyRichTableCellBackground(null, cell),
        () => this.applyRichTableCellBackgroundCustom(cell)
      );
    });
    addSubmenu(tm.borderSettings, (panel) => {
      if (!table) return;
      const selectedColor = normalizeColor(
        sampleBorderCell.style.borderColor || window.getComputedStyle(sampleBorderCell).borderColor || ""
      );
      const grid = panel.createDiv({ cls: "yori-rich-table-color-grid" });
      RICH_COLOR_GRID_HUE_ROWS.forEach((row) => {
        const rowEl = grid.createDiv({ cls: "yori-rich-table-color-row" });
        row.forEach((hex) => {
          const swatch = rowEl.createEl("button", {
            cls: "yori-rich-table-color-swatch",
            attr: { "aria-label": tm.ariaBorderColor(hex), title: hex }
          });
          swatch.style.backgroundColor = hex;
          if (selectedColor && normalizeColor(hex) === selectedColor) {
            swatch.addClass("is-active");
          }
          swatch.addEventListener("mousedown", (evt) => evt.preventDefault());
          swatch.addEventListener("click", () => {
            const w = this.getRichTableBorderWidthTokenForApply(table);
            this.applyRichTableBorder(w, hex, cell);
            this.closeRichTableContextMenu();
          });
        });
      });
      addDivider(panel);
      const activeW = this.getRichTableActiveBorderWidthKey(table);
      RICH_BORDER_WIDTH_PRESETS.forEach((preset) => {
        const btn = panel.createEl("button", {
          cls: "yori-border-width-option",
          attr: { type: "button", "data-yori-table-border-width": preset.width }
        });
        btn.createSpan({ cls: "yori-border-width-check", text: "✓" });
        btn.createSpan({ cls: "yori-border-width-label", text: richBorderWidthPresetLabel(lang, preset.width) });
        if (activeW === preset.width) btn.addClass("is-active");
        btn.addEventListener("mousedown", (evt) => evt.preventDefault());
        btn.addEventListener("click", () => {
          this.applyRichTableBorderWidth(preset.width, cell);
          this.closeRichTableContextMenu();
        });
      });
      addDivider(panel);
      addItem(tm.clearBorder, () => this.clearRichTableBorder(cell), false, panel);
      addItem(tm.customBorderColor, () => {
        void this.applyRichTableBorderCustom(cell);
      }, false, panel);
    });

    addDivider();

    addItem(tm.clearFormatting, () => this.clearRichFormattingForSelectionOrCells());
    addItem(tm.insertInternalLink, () => this.openVaultLinkPicker("rich", null));
    addItem(tm.insertNoteTag, () => {
      this.captureRichCaretForTagInsert();
      openRichTagInsertModal(this.app, this.makeRichTagInsertHost(), lang);
    });
    addDivider();

    if (showMergeCells) {
      addItem(tm.mergeCells, () => this.mergeSelectedRichTableCells(cell));
    }
    if (showSplitCell) {
      addItem(tm.splitCell, () => this.splitRichTableCell(cell));
    }
    if (showMergeCells || showSplitCell) {
      addDivider();
    }
    addItem(tm.addRow, () => this.addRichTableRow(cell));
    addItem(tm.deleteRow, () => this.removeRichTableRow(cell), true);
    addItem(tm.addColumn, () => this.addRichTableColumn(cell));
    addItem(tm.deleteColumn, () => this.removeRichTableColumn(cell), true);
    addDivider();
    if (showConvertToNumbered) {
      addItem(tm.convertNumbered, () => this.convertRichTableColumnToNumbered(cell));
    }
    if (showConvertToMarked) {
      addItem(tm.convertMarked, () => this.convertRichTableColumnToMarked(cell));
    }
    if (showRestoreNormalColumn) {
      addItem(tm.restoreNormalColumn, () => this.convertRichTableColumnToNormal(cell));
    }

    document.body.appendChild(menu);
    this.richTableContextMenuEl = menu;

    const rect = menu.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width - 8;
    const maxY = window.innerHeight - rect.height - 8;
    menu.style.left = `${Math.max(8, Math.min(x, maxX))}px`;
    menu.style.top = `${Math.max(8, Math.min(y, maxY))}px`;
  }

  /**
   * 表格自定义菜单挂在 body 上；需在捕获阶段判断，否则高级编辑区内的 mousedown 可能被拦掉导致无法点空白收起。
   */
  private closeRichTableContextMenuIfOutsidePointer(evt: PointerEvent): void {
    const menu = this.richTableContextMenuEl;
    if (!menu?.isConnected) return;
    const path = typeof evt.composedPath === "function" ? evt.composedPath() : [];
    const hit =
      path.length > 0
        ? path.some((n) => n instanceof Node && (n === menu || menu.contains(n)))
        : evt.target instanceof Node && menu.contains(evt.target);
    if (!hit) this.closeRichTableContextMenu();
  }

  private closeRichTableContextMenu(): void {
    this.richTableContextMenuEl?.remove();
    this.richTableContextMenuEl = null;
    this.richContextCell = null;
  }

  /** `![[文件|400]]` / `![[文件|400px]]` 中管道后纯数字视作宽度（像素），与 Obsidian 图片缩放习惯一致 */
  private parseNumericEmbedWidthSuffix(s: string): number | null {
    const t = s.trim();
    if (!t) return null;
    const px = t.match(/^(\d+)px$/i);
    if (px) {
      const n = parseInt(px[1], 10);
      return Number.isFinite(n) && n > 0 ? n : null;
    }
    if (/^\d+$/.test(t)) {
      const n = parseInt(t, 10);
      return Number.isFinite(n) && n > 0 ? n : null;
    }
    return null;
  }

  /**
   * 将图片/音视频/PDF 等包成独立块：外层可编辑容器内为 contenteditable=false，便于后面落光标并整段删除。
   */
  private wrapRichMediaBlock(media: HTMLElement): HTMLElement {
    const block = document.createElement("div");
    block.className = YORI_RICH_MEDIA_PARAGRAPH_CLASS;
    const holder = document.createElement("div");
    holder.className = YORI_RICH_ATOMIC_EMBED_CLASS;
    holder.contentEditable = "false";
    holder.appendChild(media);
    block.appendChild(holder);
    return block;
  }

  /** Obsidian 式：可拖动右下角改变宽度，脱水合为 ![[path|width]] */
  private wrapRichImageWithResizeHost(img: HTMLImageElement): HTMLElement {
    const host = document.createElement("div");
    host.className = YORI_IMG_RESIZE_HOST_CLASS;
    host.contentEditable = "false";
    const frame = document.createElement("div");
    frame.className = "yori-rich-img-resize-frame";
    const handle = document.createElement("div");
    handle.className = "yori-rich-img-resize-handle";
    handle.setAttribute("draggable", "false");
    handle.setAttribute("aria-label", "拖动调整图片宽度");
    frame.appendChild(img);
    frame.appendChild(handle);
    host.appendChild(frame);
    return host;
  }

  private mergePixelWidthIntoImageEmbedRaw(rawInner: string, widthPx: number): string {
    const w = Math.max(32, Math.min(4096, Math.round(widthPx)));
    const pipeIdx = rawInner.indexOf("|");
    const pathPart = (pipeIdx >= 0 ? rawInner.slice(0, pipeIdx) : rawInner).trim();
    return `${pathPart}|${w}`;
  }

  private cleanupRichImageResizeListeners(): void {
    if (this.richImageResizeMoveHandler) {
      document.removeEventListener("mousemove", this.richImageResizeMoveHandler);
      this.richImageResizeMoveHandler = null;
    }
    if (this.richImageResizeUpHandler) {
      document.removeEventListener("mouseup", this.richImageResizeUpHandler, true);
      this.richImageResizeUpHandler = null;
    }
    document.body.style.removeProperty("user-select");
    this.richImageResizeSession = null;
  }

  private startRichImageResize(evt: MouseEvent, handle: HTMLElement): void {
    if (!this.richEditorEl) return;
    this.cleanupRichImageResizeListeners();
    const frame = handle.closest(".yori-rich-img-resize-frame");
    const img = frame?.querySelector("img[data-yori-image-embed]") as HTMLImageElement | null;
    if (!img) return;
    this.rememberRichStateForUndo();
    const startW = img.getBoundingClientRect().width;
    this.richImageResizeSession = { img, startX: evt.clientX, startW };
    document.body.style.userSelect = "none";

    const onMove = (e: MouseEvent): void => {
      const s = this.richImageResizeSession;
      if (!s) return;
      const dw = e.clientX - s.startX;
      let nw = s.startW + dw;
      nw = Math.max(32, Math.min(4096, nw));
      s.img.style.maxWidth = `${nw}px`;
      s.img.style.width = "100%";
      s.img.style.height = "auto";
    };
    const onUp = (): void => {
      const s = this.richImageResizeSession;
      this.cleanupRichImageResizeListeners();
      if (s?.img.isConnected) {
        const raw = s.img.getAttribute("data-yori-image-embed") ?? "";
        const w = Math.round(s.img.getBoundingClientRect().width);
        s.img.setAttribute("data-yori-image-embed", this.mergePixelWidthIntoImageEmbedRaw(raw, w));
        this.markRichDirty();
        this.scheduleRichAutoSave();
      }
      this.scheduleRichSelectionVisualSync();
    };
    this.richImageResizeMoveHandler = onMove;
    this.richImageResizeUpHandler = onUp;
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp, true);
  }

  /** Obsidian 风格：![[非内联预览类文件]] 在笔记中表现为文件嵌入条 */
  private createRichGenericFileEmbed(dest: TFile, rawInner: string): HTMLElement {
    const row = document.createElement("div");
    row.className = "yori-rich-generic-embed";
    row.setAttribute("data-yori-file-embed", rawInner);
    row.contentEditable = "false";
    const icon = document.createElement("span");
    icon.className = "yori-rich-generic-embed-icon";
    try {
      setIcon(icon, "file");
    } catch {
      // ignore
    }
    const text = document.createElement("a");
    text.className = "internal-link";
    text.setAttribute("data-href", dest.path);
    text.setAttribute("href", dest.path);
    text.setAttribute("data-yori-wikilink", rawInner);
    text.textContent = dest.name;
    row.appendChild(icon);
    row.appendChild(text);
    return row;
  }

  private mergeSelectedRichTableCells(baseCell: HTMLTableCellElement): void {
    const table = this.getCurrentRichTable(baseCell);
    if (!table) return;
    const selected = this.getSelectedRichTableCells(table);
    if (selected.length < 2) {
      new Notice("请先拖动选中多个单元格后再合并。");
      return;
    }

    const model = buildRichTableGrid(table);
    const positions = selected
      .map((cell) => ({ cell, pos: model.origins.get(cell) }))
      .filter((entry): entry is { cell: HTMLTableCellElement; pos: { row: number; col: number } } => !!entry.pos);
    if (positions.length < 2) {
      new Notice("选区无效，无法合并。");
      return;
    }

    const minRow = Math.min(...positions.map((x) => x.pos.row));
    const maxRow = Math.max(...positions.map((x) => x.pos.row));
    const minCol = Math.min(...positions.map((x) => x.pos.col));
    const maxCol = Math.max(...positions.map((x) => x.pos.col));
    const selectedSet = new Set(positions.map((x) => x.cell));

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const occupying = model.grid[r]?.[c] ?? null;
        if (!occupying || !selectedSet.has(occupying)) {
          new Notice("仅支持矩形连续选区合并，请重新框选。");
          return;
        }
      }
    }

    const topLeft = getOriginCellByGridPosition(table, minRow, minCol);
    if (!topLeft || !selectedSet.has(topLeft)) {
      new Notice("选区无效，无法定位左上角单元格。");
      return;
    }

    const ordered = [...positions].sort((a, b) => (a.pos.row - b.pos.row) || (a.pos.col - b.pos.col));
    const mergedHtml = ordered
      .map((entry) => entry.cell.innerHTML.trim())
      .filter((s) => s.length > 0)
      .join("<br>");
    if (mergedHtml) {
      topLeft.innerHTML = mergedHtml;
    }

    topLeft.rowSpan = maxRow - minRow + 1;
    topLeft.colSpan = maxCol - minCol + 1;

    ordered.forEach((entry) => {
      if (entry.cell !== topLeft) {
        entry.cell.remove();
      }
    });

    this.applyRichTableColumnTypes(table);
    this.markRichDirty();
    this.scheduleRichAutoSave();
  }

  private splitRichTableCell(cell: HTMLTableCellElement): void {
    const table = this.getCurrentRichTable(cell);
    if (!table) return;
    const model = buildRichTableGrid(table);
    const pos = model.origins.get(cell);
    if (!pos) return;
    const row = table.rows[pos.row];
    if (!row) return;
    const originalColSpan = Math.max(1, cell.colSpan);
    const originalRowSpan = Math.max(1, cell.rowSpan);
    if (originalColSpan === 1 && originalRowSpan === 1) {
      new Notice("当前单元格无需拆分。");
      return;
    }
    const tag = cell.tagName.toLowerCase();

    if (originalColSpan > 1) {
      for (let i = 1; i < originalColSpan; i++) {
        const extra = document.createElement(tag);
        extra.innerHTML = "<br>";
        row.insertBefore(extra, cell.nextSibling);
      }
      cell.colSpan = 1;
    }

    if (originalRowSpan > 1) {
      cell.rowSpan = 1;
      for (let i = 1; i < originalRowSpan; i++) {
        const targetRow = table.rows[pos.row + i];
        if (!targetRow) continue;
        for (let j = 0; j < originalColSpan; j++) {
          const extra = document.createElement(tag);
          extra.innerHTML = "<br>";
          const currentModel = buildRichTableGrid(table);
          const ref = findOriginCellAtOrAfter(currentModel, pos.row + i, pos.col + j);
          if (ref && ref.parentElement === targetRow) {
            targetRow.insertBefore(extra, ref);
          } else {
            targetRow.appendChild(extra);
          }
        }
      }
    }

    this.applyRichTableColumnTypes(table);
    this.markRichDirty();
    this.scheduleRichAutoSave();
  }

  private convertRichTableColumnToNumbered(cell: HTMLTableCellElement): void {
    const table = this.getCurrentRichTable(cell);
    if (!table) return;
    const colIndex = this.resolveRichTableColumnIndex(table, cell);
    if (colIndex < 0) return;
    const rows = Array.from(table.rows);
    if (!rows.length) return;
    const contentRows = rows.slice(1);
    const headerCell = getOriginCellByGridPosition(table, 0, colIndex);
    const currentType = headerCell?.dataset.yoriColType ?? "";
    if (currentType === "numbered") {
      this.applyRichTableColumnTypes(table);
      this.scheduleRestoreRichEditorFocusInTableCell(cell);
      return;
    }
    if (this.columnHasMeaningfulContent(contentRows, colIndex)) {
      const ok = window.confirm("该列已有内容，转换为编号列将清空该列现有数据。是否继续？");
      if (!ok) return;
    }
    if (headerCell) headerCell.dataset.yoriColType = "numbered";
    this.applyRichTableColumnTypes(table);
    this.markRichDirty();
    this.scheduleRichAutoSave();
    this.scheduleRestoreRichEditorFocusInTableCell(cell);
  }

  private convertRichTableColumnToMarked(cell: HTMLTableCellElement): void {
    const table = this.getCurrentRichTable(cell);
    if (!table) return;
    const colIndex = this.resolveRichTableColumnIndex(table, cell);
    if (colIndex < 0) return;
    const rows = Array.from(table.rows);
    if (!rows.length) return;
    const contentRows = rows.slice(1);
    const headerCell = getOriginCellByGridPosition(table, 0, colIndex);
    const currentType = headerCell?.dataset.yoriColType ?? "";
    if (currentType === "marked") {
      this.applyRichTableColumnTypes(table);
      this.scheduleRestoreRichEditorFocusInTableCell(cell);
      return;
    }
    if (this.columnHasMeaningfulContent(contentRows, colIndex)) {
      const ok = window.confirm("该列已有内容，转换为标记列将清空该列现有数据。是否继续？");
      if (!ok) return;
    }
    if (headerCell) headerCell.dataset.yoriColType = "marked";
    this.applyRichTableColumnTypes(table);
    this.markRichDirty();
    this.scheduleRichAutoSave();
    this.scheduleRestoreRichEditorFocusInTableCell(cell);
  }

  private convertRichTableColumnToNormal(cell: HTMLTableCellElement): void {
    const table = this.getCurrentRichTable(cell);
    if (!table) return;
    const colIndex = this.resolveRichTableColumnIndex(table, cell);
    if (colIndex < 0) return;
    const headerCell = getOriginCellByGridPosition(table, 0, colIndex);
    if (!headerCell) return;
    const currentType = headerCell.dataset.yoriColType ?? "";
    if (currentType !== "numbered" && currentType !== "marked") {
      new Notice("当前列不是编号列或标记列。");
      return;
    }
    delete headerCell.dataset.yoriColType;
    // 恢复普通列后仅清理自动生成的内容，保留首行标题为“标题”。
    headerCell.textContent = "标题";
    const model = buildRichTableGrid(table);
    for (let row = 1; row < model.grid.length; row++) {
      const target = getOriginCellByGridPosition(table, row, colIndex);
      if (!target) continue;
      target.textContent = "";
    }
    this.markRichDirty();
    this.scheduleRichAutoSave();
    this.scheduleRestoreRichEditorFocusInTableCell(cell);
  }

  private setRichMarkedColumnChecked(cell: HTMLTableCellElement, checked: boolean): void {
    const table = this.getCurrentRichTable(cell);
    if (!table) return;
    const colIndex = this.resolveRichTableColumnIndex(table, cell);
    if (colIndex < 0) return;
    const headerCell = getOriginCellByGridPosition(table, 0, colIndex);
    if (!headerCell || headerCell.dataset.yoriColType !== "marked") {
      new Notice("请先将该列设置为标记列。");
      return;
    }
    const model = buildRichTableGrid(table);
    for (let row = 1; row < model.grid.length; row++) {
      const target = getOriginCellByGridPosition(table, row, colIndex);
      if (!target) continue;
      const checkbox = target.querySelector("input[type='checkbox']") as HTMLInputElement | null;
      if (checkbox) {
        checkbox.checked = checked;
        if (!checkbox.nextSibling) {
          target.appendChild(document.createElement("br"));
        }
      } else {
        target.innerHTML = `<input type='checkbox' ${checked ? "checked" : ""} /><br>`;
      }
    }
    this.markRichDirty();
    this.scheduleRichAutoSave();
  }

  private insertRichImageIntoCell(cell: HTMLTableCellElement): void {
    const url = window.prompt("请输入图片链接（http/https 或 data URL）", "https://");
    if (!url) return;
    const safeUrl = url.trim();
    if (!safeUrl) return;
    const alt = window.prompt("请输入图片说明（可选）", "") ?? "";
      cell.innerHTML = `<img src="${safeUrl}" alt="${escapeHtml(alt)}" style="max-width:100%;height:auto;display:block;" />`;
    this.markRichDirty();
    this.scheduleRichAutoSave();
  }

  private clearRichTableCell(cell: HTMLTableCellElement): void {
    cell.innerHTML = "<br>";
    this.markRichDirty();
    this.scheduleRichAutoSave();
  }

  private clearRichTableRow(cell: HTMLTableCellElement): void {
    const row = cell.parentElement as HTMLTableRowElement | null;
    if (!row) return;
    Array.from(row.cells).forEach((c) => {
      const el = c as HTMLTableCellElement;
      if (el.dataset.yoriColType) return;
      el.innerHTML = "<br>";
    });
    this.markRichDirty();
    this.scheduleRichAutoSave();
  }

  private clearRichTableColumn(cell: HTMLTableCellElement): void {
    const table = this.getCurrentRichTable(cell);
    if (!table) return;
    const colIndex = this.resolveRichTableColumnIndex(table, cell);
    if (colIndex < 0) return;
    const model = buildRichTableGrid(table);
    for (let row = 1; row < model.grid.length; row++) {
      const target = getOriginCellByGridPosition(table, row, colIndex);
      if (!target) continue;
      target.innerHTML = "<br>";
    }
    this.markRichDirty();
    this.scheduleRichAutoSave();
  }

  private columnHasMeaningfulContent(rows: HTMLTableRowElement[], colIndex: number): boolean {
    return rows.some((row) => {
      const cell = row.cells[colIndex] as HTMLTableCellElement | undefined;
      if (!cell) return false;
      const ch = Array.from(cell.children);
      const hasCheckboxOnly =
        (ch.length === 1 &&
          ch[0] instanceof HTMLInputElement &&
          ch[0].type === "checkbox") ||
        (ch.length === 2 &&
          ch[0] instanceof HTMLInputElement &&
          ch[0].type === "checkbox" &&
          ch[1].tagName === "BR");
      if (hasCheckboxOnly) return false;
      const text = (cell.textContent ?? "").trim();
      return text.length > 0;
    });
  }

  /**
   * 只替换「可见文本」为 nextPlainText，保留 mark/span 等与样式相关的 DOM 结构。
   * 用于编号列重排行号时避免 textContent 整格清空导致字色、高亮丢失。
   */
  private replaceRichCellTextPreservingInlineStructure(cell: HTMLElement, nextPlainText: string): void {
    const texts: Text[] = [];
    const walk = (node: Node): void => {
      if (node.nodeType === Node.TEXT_NODE) {
        const t = (node.nodeValue ?? "").trim();
        if (t.length > 0) texts.push(node as Text);
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const el = node as Element;
      if (el.tagName === "SCRIPT" || el.tagName === "STYLE") return;
      for (const c of Array.from(node.childNodes)) walk(c);
    };
    walk(cell);

    if (texts.length === 1) {
      texts[0].nodeValue = nextPlainText;
      return;
    }
    if (texts.length > 1) {
      texts[0].nodeValue = nextPlainText;
      for (let i = 1; i < texts.length; i++) texts[i].nodeValue = "";
      return;
    }
    cell.textContent = nextPlainText;
  }

  private applyRichTableColumnTypes(table: HTMLTableElement): void {
    const model = buildRichTableGrid(table);
    const headerRow = model.grid[0] ?? [];
    const typedColumns: Array<{ col: number; type: "numbered" | "marked" }> = [];

    headerRow.forEach((headerCell, col) => {
      if (!headerCell) return;
      const origin = model.origins.get(headerCell);
      if (!origin || origin.row !== 0 || origin.col !== col) return;
      const type = headerCell.dataset.yoriColType;
      if (type === "numbered" || type === "marked") {
        typedColumns.push({ col, type });
      }
    });

    typedColumns.forEach(({ col, type }) => {
      const headerCell = getOriginCellByGridPosition(table, 0, col);
      if (headerCell) {
        this.replaceRichCellTextPreservingInlineStructure(
          headerCell,
          type === "numbered" ? "编号" : "标记"
        );
      }
      for (let row = 1; row < model.grid.length; row++) {
        const target = getOriginCellByGridPosition(table, row, col);
        if (!target) continue;
        if (type === "numbered") {
          this.replaceRichCellTextPreservingInlineStructure(target, `${row}`);
        } else {
          const input = target.querySelector("input[type='checkbox']") as HTMLInputElement | null;
          if (!input) {
            target.innerHTML = "<input type='checkbox' /><br>";
          } else if (!input.nextSibling) {
            target.appendChild(document.createElement("br"));
          }
        }
      }
    });
  }

  private resolveRichTableColumnIndex(table: HTMLTableElement, cell: HTMLTableCellElement): number {
    const model = buildRichTableGrid(table);
    const pos = model.origins.get(cell);
    return pos?.col ?? -1;
  }

  private getSelectedRichBlocks(): HTMLElement[] {
    if (!this.richEditorEl) return [];
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return [];
    const range = selection.getRangeAt(0);
    const selector = "p,div,li,blockquote,h1,h2,h3,h4,h5,h6,td,th";
    const blocks = Array.from(this.richEditorEl.querySelectorAll(selector)) as HTMLElement[];
    if (!blocks.length) {
      return [this.richEditorEl];
    }
    if (selection.isCollapsed) {
      const collapsed = this.findClosestRichBlock(selection.anchorNode);
      return collapsed ? [collapsed] : [];
    }
    return blocks.filter((block) => range.intersectsNode(block));
  }

  private getSelectedRichTableCells(table: HTMLTableElement): HTMLTableCellElement[] {
    return bulkPickRichTableCellsForTable(table, {
      dragAnchorCell: this.richDragAnchorCell,
      dragFocusCell: this.richDragFocusCell,
      isTableDragging: this.richIsTableDragging,
      getCurrentTableCell: () => this.getCurrentRichTableCell(),
    });
  }

  private handleRichTableDragStart(evt: MouseEvent): void {
    if (!this.richEditorEl || evt.button !== 0) return;
    const cell = getClosestRichTableCellFromTarget(evt.target);
    if (!cell || !this.richEditorEl.contains(cell)) {
      this.clearRichTableDragSelection();
      this.scheduleRichSelectionVisualSync();
      return;
    }

    const resizeHit = this.getRichTableResizeHit(cell, evt);
    if (resizeHit) {
      this.richResizeMode = resizeHit;
      this.richResizeCell = cell;
      this.richResizeStartX = evt.clientX;
      this.richResizeStartY = evt.clientY;
      if (resizeHit === "col") {
        const table = this.getCurrentRichTable(cell);
        const colIndex = table ? this.resolveRichTableColumnIndex(table, cell) : -1;
        const neighborIndex = table && colIndex >= 0 && getOriginCellByGridPosition(table, 0, colIndex + 1) ? colIndex + 1 : -1;
        if (table) {
          this.lockRichTableForColumnResize(table);
          this.richResizeTableStartWidth = Math.round(table.getBoundingClientRect().width);
        } else {
          this.richResizeTableStartWidth = 0;
        }
        this.richResizeColIndex = colIndex;
        this.richResizeNeighborColIndex = neighborIndex;
        this.richResizeStartSize = table && colIndex >= 0 ? this.getRichColumnCurrentWidthByIndex(table, colIndex) : 120;
        this.richResizeNeighborStartSize =
          table && neighborIndex >= 0 ? this.getRichColumnCurrentWidthByIndex(table, neighborIndex) : 0;
      } else {
        this.richResizeStartSize = this.getRichRowCurrentHeight(cell);
        this.richResizeColIndex = -1;
        this.richResizeNeighborColIndex = -1;
        this.richResizeNeighborStartSize = 0;
      }
      this.richEditorEl.addClass("is-table-resizing");
      evt.preventDefault();
      return;
    }

    this.richDragAnchorCell = cell;
    this.richDragFocusCell = cell;
    this.richIsTableDragging = false;
    this.richLastTableDragClientX = evt.clientX;
    this.richLastTableDragClientY = evt.clientY;
  }

  private handleRichTableDragMove(evt: MouseEvent): void {
    if (!this.richEditorEl) return;

    if (this.richResizeMode && this.richResizeCell) {
      if ((evt.buttons & 1) === 0) return;
      evt.preventDefault();
      if (this.richResizeMode === "col") {
        const table = this.getCurrentRichTable(this.richResizeCell);
        if (!table || this.richResizeColIndex < 0) return;
        const delta = evt.clientX - this.richResizeStartX;
        const minWidth = 60;
        if (this.richResizeNeighborColIndex >= 0) {
          const deltaMin = minWidth - this.richResizeStartSize;
          const deltaMax = this.richResizeNeighborStartSize - minWidth;
          const applied = Math.max(deltaMin, Math.min(delta, deltaMax));
          const nextCurrent = this.richResizeStartSize + applied;
          const nextNeighbor = this.richResizeNeighborStartSize - applied;
          this.applyRichColumnWidthByIndex(table, this.richResizeColIndex, nextCurrent);
          this.applyRichColumnWidthByIndex(table, this.richResizeNeighborColIndex, nextNeighbor);
        } else {
          const next = Math.max(minWidth, this.richResizeStartSize + delta);
          this.applyRichColumnWidthByIndex(table, this.richResizeColIndex, next);
          const widthDelta = next - this.richResizeStartSize;
          const minTableWidth = this.getRichTableColumnCount(table) * minWidth;
          const nextTableWidth = Math.max(minTableWidth, this.richResizeTableStartWidth + widthDelta);
          table.style.width = `${nextTableWidth}px`;
        }
      } else {
        const delta = evt.clientY - this.richResizeStartY;
        const next = Math.max(28, this.richResizeStartSize + delta);
        this.applyRichRowHeight(this.richResizeCell, next);
      }
      return;
    }

    const hoverCell = getClosestRichTableCellFromTarget(evt.target);
    if ((evt.buttons & 1) === 0) {
      this.updateRichResizeCursor(hoverCell, evt);
      return;
    }

    if (!this.richDragAnchorCell) return;
    this.richLastTableDragClientX = evt.clientX;
    this.richLastTableDragClientY = evt.clientY;
    const cell = hoverCell;
    if (!cell || !this.richEditorEl.contains(cell)) return;
    const anchorTable = this.richDragAnchorCell.closest("table");
    const focusTable = cell.closest("table");
    if (!anchorTable || anchorTable !== focusTable) return;
    if (cell === this.richDragAnchorCell && !this.richIsTableDragging) return;

    if (!this.richIsTableDragging) {
      this.richIsTableDragging = true;
      this.richEditorEl.addClass("is-cell-drag-selecting");
      clearNativeSelectionInRichEditor(this.richEditorEl);
    }

    if (this.richDragFocusCell !== cell) {
      this.richDragFocusCell = cell;
      clearNativeSelectionInRichEditor(this.richEditorEl);
      this.scheduleRichSelectionVisualSync();
    }
  }

  /** 在结束拖选时根据指针落点修正 focus，避免「最后一格没有 mousemove」时 anchor===focus 导致批量样式判成单格。 */
  private syncRichTableDragFocusCellAt(clientX: number, clientY: number): void {
    if (!this.richDragAnchorCell || !this.richEditorEl) return;
    const el = document.elementFromPoint(clientX, clientY);
    const cell = el ? getClosestRichTableCellFromTarget(el) : null;
    const anchorTable = this.richDragAnchorCell.closest("table");
    if (
      cell &&
      this.richEditorEl.contains(cell) &&
      anchorTable &&
      anchorTable === cell.closest("table")
    ) {
      if (this.richDragFocusCell !== cell) {
        this.richDragFocusCell = cell;
        clearNativeSelectionInRichEditor(this.richEditorEl);
      }
    }
  }

  private handleRichTableDragEnd(evt?: MouseEvent): void {
    if (!this.richEditorEl) return;
    if (this.richResizeMode && this.richResizeCell) {
      this.richResizeMode = null;
      this.richResizeCell = null;
      this.richResizeColIndex = -1;
      this.richResizeNeighborColIndex = -1;
      this.richResizeNeighborStartSize = 0;
      this.richResizeTableStartWidth = 0;
      this.richEditorEl.removeClass("is-table-resizing");
      this.richEditorEl.style.cursor = "";
      this.markRichDirty();
      this.scheduleRichAutoSave();
      return;
    }
    if (this.richIsTableDragging) {
      if (evt?.type === "mouseup") {
        this.syncRichTableDragFocusCellAt(evt.clientX, evt.clientY);
      } else {
        this.syncRichTableDragFocusCellAt(this.richLastTableDragClientX, this.richLastTableDragClientY);
      }
      this.richIsTableDragging = false;
      this.richEditorEl.removeClass("is-cell-drag-selecting");
      clearNativeSelectionInRichEditor(this.richEditorEl);
      this.scheduleRichSelectionVisualSync();
      return;
    }
    this.richEditorEl.style.cursor = "";
  }

  private clearRichTableDragSelection(): void {
    this.richDragAnchorCell = null;
    this.richDragFocusCell = null;
    this.richIsTableDragging = false;
    this.richEditorEl?.removeClass("is-cell-drag-selecting");
  }

  private updateRichResizeCursor(cell: HTMLTableCellElement | null, evt: MouseEvent): void {
    if (!this.richEditorEl) return;
    if (!cell) {
      this.richEditorEl.style.cursor = "";
      return;
    }
    const hit = this.getRichTableResizeHit(cell, evt);
    if (hit === "col") this.richEditorEl.style.cursor = "col-resize";
    else if (hit === "row") this.richEditorEl.style.cursor = "row-resize";
    else this.richEditorEl.style.cursor = "";
  }

  private getRichTableResizeHit(cell: HTMLTableCellElement, evt: MouseEvent): "col" | "row" | null {
    const rect = cell.getBoundingClientRect();
    const edge = 5;
    const nearRight = evt.clientX >= rect.right - edge && evt.clientX <= rect.right + edge;
    const nearBottom = evt.clientY >= rect.bottom - edge && evt.clientY <= rect.bottom + edge;
    if (nearRight) return "col";
    if (nearBottom) return "row";
    return null;
  }

  private getRichColumnCurrentWidth(cell: HTMLTableCellElement): number {
    const widthStyle = Number.parseFloat(cell.style.width || "");
    if (Number.isFinite(widthStyle) && widthStyle > 0) return widthStyle;
    const rect = cell.getBoundingClientRect().width;
    return rect > 0 ? Math.round(rect) : 120;
  }

  private getRichColumnCurrentWidthByIndex(table: HTMLTableElement, colIndex: number): number {
    const cell = getOriginCellByGridPosition(table, 0, colIndex);
    if (!cell) return 120;
    const widthStyle = Number.parseFloat(cell.style.width || "");
    if (Number.isFinite(widthStyle) && widthStyle > 0) return widthStyle;
    const rect = cell.getBoundingClientRect().width;
    return rect > 0 ? Math.round(rect) : 120;
  }

  private lockRichTableForColumnResize(table: HTMLTableElement): void {
    const model = buildRichTableGrid(table);
    const colCount = model.grid[0]?.length ?? 0;
    const cols = this.ensureRichTableColgroup(table, colCount);
    for (let col = 0; col < colCount; col++) {
      const width = this.getRichColumnCurrentWidthByIndex(table, col);
      const colEl = cols[col];
      if (colEl) {
        colEl.style.width = `${width}px`;
        colEl.style.minWidth = `${width}px`;
      }
    }
    table.style.tableLayout = "fixed";
    table.style.width = `${Math.round(table.getBoundingClientRect().width)}px`;
  }

  private getRichTableColumnCount(table: HTMLTableElement): number {
    const model = buildRichTableGrid(table);
    return model.grid[0]?.length ?? 0;
  }

  private getRichRowCurrentHeight(cell: HTMLTableCellElement): number {
    const row = cell.parentElement as HTMLTableRowElement | null;
    if (!row) return 32;
    const styleH = Number.parseFloat(row.style.height || "");
    if (Number.isFinite(styleH) && styleH > 0) return styleH;
    const rect = row.getBoundingClientRect().height;
    return rect > 0 ? Math.round(rect) : 32;
  }

  private applyRichColumnWidth(cell: HTMLTableCellElement, width: number): void {
    const table = this.getCurrentRichTable(cell);
    if (!table) return;
    const colIndex = this.resolveRichTableColumnIndex(table, cell);
    if (colIndex < 0) return;
    this.applyRichColumnWidthByIndex(table, colIndex, width);
  }

  private applyRichColumnWidthByIndex(table: HTMLTableElement, colIndex: number, width: number): void {
    const colCount = this.getRichTableColumnCount(table);
    const cols = this.ensureRichTableColgroup(table, colCount);
    const colEl = cols[colIndex];
    if (colEl) {
      colEl.style.width = `${width}px`;
      colEl.style.minWidth = `${width}px`;
    }

    const model = buildRichTableGrid(table);
    for (let row = 0; row < model.grid.length; row++) {
      const target = getOriginCellByGridPosition(table, row, colIndex);
      if (!target) continue;
      target.style.width = `${width}px`;
      target.style.minWidth = `${width}px`;
    }
  }

  private syncRichTableLayoutAfterStructureChange(table: HTMLTableElement): void {
    const colCount = this.getRichTableColumnCount(table);
    if (colCount <= 0) return;
    if (!this.isRichTableLayoutCustomized(table)) {
      this.ensureRichTableDefaultColumnWidths(table);
      return;
    }
    const hasLockedLayout = table.style.tableLayout === "fixed" || !!table.querySelector("colgroup");
    if (!hasLockedLayout) return;
    const cols = this.ensureRichTableColgroup(table, colCount);
    let totalWidth = 0;
    for (let col = 0; col < colCount; col++) {
      const colEl = cols[col];
      if (!colEl) continue;
      let width = Number.parseFloat(colEl.style.width || "");
      const wRaw = colEl.style.width || "";
      if (wRaw.includes("%") || !Number.isFinite(width) || width <= 0) {
        width = this.getRichColumnCurrentWidthByIndex(table, col);
      }
      if (!Number.isFinite(width) || width <= 0) width = 120;
      width = Math.max(56, Math.round(width));
      colEl.style.width = `${width}px`;
      colEl.style.minWidth = `${width}px`;
      totalWidth += width;
    }
    if (totalWidth > 0) {
      table.style.tableLayout = "fixed";
      table.style.width = `${totalWidth}px`;
    }
  }

  private isRichTableLayoutCustomized(table: HTMLTableElement): boolean {
    if (/\d+(?:\.\d+)?px/i.test(table.style.width)) return true;
    return Array.from(table.querySelectorAll("colgroup col")).some((c) => {
      const el = c as HTMLTableColElement;
      const w = `${el.style.width} ${el.style.minWidth}`;
      return /\d+(?:\.\d+)?px/i.test(w);
    });
  }

  private ensureRichTableDefaultColumnWidths(table: HTMLTableElement): void {
    if (this.isRichTableLayoutCustomized(table)) return;
    const colCount = this.getRichTableColumnCount(table);
    if (colCount <= 0) return;
    const cols = this.ensureRichTableColgroup(table, colCount);
    const pct = 100 / colCount;
    for (let i = 0; i < colCount; i++) {
      const colEl = cols[i];
      if (!colEl) continue;
      colEl.style.width = `${pct}%`;
      colEl.style.removeProperty("min-width");
    }
    table.style.tableLayout = "fixed";
    table.style.width = "100%";
    table.style.maxWidth = "100%";
  }

  private normalizeAllRichTables(): void {
    if (!this.richEditorEl) return;
    this.richEditorEl.querySelectorAll("table").forEach((t) => {
      this.ensureRichTableDefaultColumnWidths(t as HTMLTableElement);
    });
  }

  private ensureRichTableColgroup(table: HTMLTableElement, colCount: number): HTMLTableColElement[] {
    let colgroup = table.querySelector("colgroup");
    if (!colgroup) {
      colgroup = document.createElement("colgroup");
      table.insertBefore(colgroup, table.firstChild);
    }
    while (colgroup.children.length < colCount) {
      colgroup.appendChild(document.createElement("col"));
    }
    while (colgroup.children.length > colCount) {
      colgroup.removeChild(colgroup.lastElementChild as ChildNode);
    }
    return Array.from(colgroup.children) as HTMLTableColElement[];
  }

  private applyRichRowHeight(cell: HTMLTableCellElement, height: number): void {
    const row = cell.parentElement as HTMLTableRowElement | null;
    if (!row) return;
    row.style.height = `${height}px`;
    Array.from(row.cells).forEach((c) => {
      (c as HTMLElement).style.height = `${height}px`;
    });
  }

  private scheduleRichSelectionVisualSync(): void {
    if (this.richSelectionSyncTimer) {
      window.clearTimeout(this.richSelectionSyncTimer);
    }
    this.richSelectionSyncTimer = window.setTimeout(() => {
      this.richSelectionSyncTimer = null;
      this.refreshRichAlignStateFromSelection();
      this.syncRichAlignButtonBySelection();
      refreshRichTableSelectionVisual({
        richEditorRoot: this.richEditorEl,
        dragAnchorCell: this.richDragAnchorCell,
        dragFocusCell: this.richDragFocusCell,
        pickSelectedForTable: (t) => this.getSelectedRichTableCells(t)
      });
      this.refreshRichBorderPanelIfOpen();
    }, 0);
    window.requestAnimationFrame(() => {
      this.refreshRichAlignStateFromSelection();
      this.syncRichAlignButtonBySelection();
      this.refreshRichBorderPanelIfOpen();
    });
  }

  private findClosestRichBlock(node: Node | null): HTMLElement | null {
    if (!node || !this.richEditorEl) return null;
    const selector = "p,div,li,blockquote,h1,h2,h3,h4,h5,h6,td,th";
    let current: Node | null = node;
    while (current) {
      if (
        current instanceof HTMLElement &&
        current !== this.richEditorEl &&
        current.matches(selector) &&
        this.richEditorEl.contains(current)
      ) {
        return current;
      }
      current = current.parentNode;
    }
    return null;
  }

  /**
   * 用 drop 的 (clientX, clientY) 在容器的「一级子节点」间插入媒体段：
   * 先命中子块矩形，再按块宽高比优先水平或垂直半区决定插在前/后，避免仅按 Y 时在「拖到另一张图右侧」时判错层级导致 DOM 错乱、双缩放手柄。
   */
  private insertRichMediaParagraphAtDropPoint(
    container: HTMLElement,
    mp: HTMLElement,
    clientX: number,
    clientY: number
  ): void {
    const kids = Array.from(container.children) as HTMLElement[];
    let hit: HTMLElement | null = null;
    for (const ch of kids) {
      const r = ch.getBoundingClientRect();
      if (
        clientX >= r.left &&
        clientX <= r.right &&
        clientY >= r.top &&
        clientY <= r.bottom
      ) {
        hit = ch;
        break;
      }
    }

    const insertAroundHit = (h: HTMLElement): void => {
      const r = h.getBoundingClientRect();
      const midX = r.left + r.width / 2;
      const midY = r.top + r.height / 2;
      const wHalf = Math.max(r.width / 2, 1);
      const hHalf = Math.max(r.height / 2, 1);
      const nx = Math.abs(clientX - midX) / wHalf;
      const ny = Math.abs(clientY - midY) / hHalf;
      const useHorizontal = r.width >= r.height * 1.05 || nx > ny;
      if (useHorizontal) {
        if (clientX < midX) container.insertBefore(mp, h);
        else h.insertAdjacentElement("afterend", mp);
      } else {
        if (clientY < midY) container.insertBefore(mp, h);
        else h.insertAdjacentElement("afterend", mp);
      }
    };

    if (hit) {
      insertAroundHit(hit);
      return;
    }

    let best: HTMLElement | null = null;
    let bestD = Infinity;
    for (const ch of kids) {
      const r = ch.getBoundingClientRect();
      const cx = Math.min(Math.max(clientX, r.left), r.right);
      const cy = Math.min(Math.max(clientY, r.top), r.bottom);
      const d = (clientX - cx) ** 2 + (clientY - cy) ** 2;
      if (d < bestD) {
        bestD = d;
        best = ch;
      }
    }
    if (best) {
      insertAroundHit(best);
      return;
    }

    container.appendChild(mp);
  }

  /** 每个 resize 框只保留一个手柄，避免异常 DOM 下两个手柄绑定同一 img */
  private sanitizeRichImageResizeHandlesInEditor(): void {
    if (!this.richEditorEl) return;
    this.richEditorEl.querySelectorAll(".yori-rich-img-resize-frame").forEach((frame) => {
      const handles = Array.from(frame.children).filter(
        (n) => n instanceof HTMLElement && n.classList.contains("yori-rich-img-resize-handle")
      );
      for (let i = 1; i < handles.length; i++) handles[i].remove();
    });
  }

  /** 若误插入到其它图的 `.yori-rich-atomic-embed` 树内，挪到该图完整媒体段之后 */
  private repairRichMediaParagraphDropNesting(mp: HTMLElement, ed: HTMLElement): void {
    if (!ed.contains(mp)) {
      ed.appendChild(mp);
      return;
    }
    let p: HTMLElement | null = mp.parentElement;
    while (p && p !== ed) {
      if (p.classList.contains(YORI_RICH_ATOMIC_EMBED_CLASS)) {
        const holder = p.parentElement;
        if (holder?.classList.contains(YORI_RICH_MEDIA_PARAGRAPH_CLASS) && holder !== mp) {
          mp.remove();
          holder.insertAdjacentElement("afterend", mp);
        }
        return;
      }
      p = p.parentElement;
    }
  }

  /**
   * 高级编辑内拖放移动媒体块：只搬运 DOM；用 drop 的 clientY 相对编辑器（或单元格）的一级子块定位，不依赖可能掉进 atomic 的选区。
   */
  private insertDetachedRichMediaParagraphFromDrop(mp: HTMLElement, evt: DragEvent): void {
    const ed = this.richEditorEl;
    if (!ed) return;
    const { clientX, clientY } = evt;
    const rawTarget = evt.target;
    const targetEl =
      rawTarget instanceof Element ? rawTarget : rawTarget instanceof Node ? rawTarget.parentElement : null;
    const cell = targetEl?.closest("td, th") as HTMLTableCellElement | null;

    if (cell && ed.contains(cell)) {
      this.insertRichMediaParagraphAtDropPoint(cell, mp, clientX, clientY);
    } else {
      this.insertRichMediaParagraphAtDropPoint(ed, mp, clientX, clientY);
    }

    this.repairRichMediaParagraphDropNesting(mp, ed);
    this.sanitizeRichImageResizeHandlesInEditor();
    this.ensureRichTrailingParagraph();
    this.ensureRichSpacerAfterMediaParagraphs();

    try {
      const sel = window.getSelection();
      if (sel) {
        const r = document.createRange();
        r.setStartAfter(mp);
        r.collapse(true);
        sel.removeAllRanges();
        sel.addRange(r);
      }
    } catch {
      /* ignore */
    }
    this.richEditorScrollCaretIntoViewIfNeeded();
  }

  private mountRichEditor(view: MarkdownView, container: Element): void {
    this.unmountRichEditor();
    const host = createDiv({ cls: "yori-rich-editor-wrap" });
    host.addEventListener("dragover", (e) => this.handleRichEditorDragOver(e as DragEvent), true);
    host.addEventListener("drop", (e) => this.handleRichEditorDrop(e as DragEvent), true);
    const editor = host.createDiv({
      cls: "yori-rich-editor",
      attr: { contenteditable: "true", tabindex: "-1" }
    });
    editor.addEventListener("dragstart", (e) => this.handleRichEditorEmbedDragStart(e as DragEvent), true);
    editor.spellcheck = true;
    editor.addEventListener("beforeinput", (evt) => {
      if (this.richSuppressRichUndoCapture) return;
      const e = evt as InputEvent;
      if (e.isComposing) return;
      if (this.tryDeleteRichAtomicEmbedBackward(e)) return;
      if (this.tryDeleteRichSpacerParagraphAfterHrBackward(e)) return;
      this.richInputNextIsDelete = typeof e.inputType === "string" && e.inputType.startsWith("delete");
      this.rememberRichStateForUndo();
    });
    editor.addEventListener("input", () => {
      const wasDelete = this.richInputNextIsDelete;
      this.richInputNextIsDelete = false;
      this.ensureRichTrailingParagraph();
      if (wasDelete) this.normalizeRichCaretAfterBorderDelete();
      this.markRichDirty();
      this.scheduleRichAutoSave();
      this.scheduleHydrateRichWikilinksOnInput();
    });
    const onRichCheckboxEdited = (): void => {
      this.markRichDirty();
      this.scheduleRichAutoSave();
    };
    editor.addEventListener(
      "change",
      (evt) => {
        const t = evt.target;
        if (t instanceof HTMLInputElement && t.type === "checkbox" && editor.contains(t)) {
          onRichCheckboxEdited();
        }
      },
      true
    );
    editor.addEventListener(
      "click",
      (evt) => {
        const t = evt.target;
        if (t instanceof HTMLInputElement && t.type === "checkbox" && editor.contains(t)) {
          window.queueMicrotask(() => onRichCheckboxEdited());
        }
      },
      true
    );
    host.addEventListener(
      "mousedown",
      (evt) => {
        if (this.tryPlaceRichCaretBelowAllBlocks(evt)) {
          evt.stopPropagation();
        }
      },
      true
    );
    editor.addEventListener(
      "mousedown",
      (evt) => {
        if (evt.button !== 0) return;
        const target = richPointerTargetElement(evt);
        const handle = target?.closest(".yori-rich-img-resize-handle");
        if (!handle || !this.richEditorEl?.contains(handle)) return;
        evt.preventDefault();
        evt.stopPropagation();
        evt.stopImmediatePropagation();
        this.startRichImageResize(evt, handle as HTMLElement);
      },
      true
    );
    editor.addEventListener("mousedown", (evt) => this.handleRichEditorInteractionMouseDown(evt), true);
    editor.addEventListener("mousedown", (evt) => this.handleRichTableDragStart(evt));
    editor.addEventListener(
      "mousedown",
      (evt) => {
        if (evt.button !== 0) return;
        const target = richPointerTargetElement(evt);
        const il = target?.closest("a.internal-link[data-yori-wikilink]") as HTMLAnchorElement | null;
        if (il && this.richEditorEl?.contains(il)) {
          evt.preventDefault();
          evt.stopPropagation();
          evt.stopImmediatePropagation();
          this.openYoriRichInternalLink(il, evt);
          return;
        }
        const ext = target?.closest("a.yori-rich-external-link") as HTMLAnchorElement | null;
        if (!ext || !this.richEditorEl?.contains(ext)) return;
        const href = ext.getAttribute("href")?.trim() ?? "";
        if (!/^https?:\/\//i.test(href)) return;
        evt.preventDefault();
        evt.stopPropagation();
        evt.stopImmediatePropagation();
        void this.openRichExternalHttpLink(href);
      },
      true
    );
    editor.addEventListener("mousemove", (evt) => this.handleRichTableDragMove(evt));
    editor.addEventListener("mouseup", (e) => this.handleRichTableDragEnd(e));
    editor.addEventListener("mouseleave", (e) => this.handleRichTableDragEnd(e));
    editor.addEventListener("blur", () => {
      this.scheduleRichAutoSave(0);
      this.hydrateRichWikilinksInEditor();
    });
    editor.addEventListener("mouseup", () => this.scheduleRichSelectionVisualSync());
    editor.addEventListener("click", (evt) => {
      const target = richPointerTargetElement(evt);
      const il = target?.closest("a.internal-link[data-yori-wikilink]") as HTMLAnchorElement | null;
      if (il && this.richEditorEl?.contains(il)) {
        evt.preventDefault();
        evt.stopPropagation();
        this.scheduleRichSelectionVisualSync();
        return;
      }
      const ext = target?.closest("a.yori-rich-external-link") as HTMLAnchorElement | null;
      if (ext && this.richEditorEl?.contains(ext)) {
        evt.preventDefault();
        evt.stopPropagation();
        return;
      }
      this.scheduleRichSelectionVisualSync();
    });
    editor.addEventListener("keyup", () => this.scheduleRichSelectionVisualSync());
    editor.addEventListener("focus", () => this.scheduleRichSelectionVisualSync());
    editor.addEventListener("focusin", () => this.scheduleRichSelectionVisualSync());
    editor.addEventListener("paste", (evt) => this.handleRichEditorPasteBareUrl(evt as ClipboardEvent), true);
    editor.addEventListener(
      "mousedown",
      (evt) => {
        if (evt.button !== 2 || !this.richEditorEl) return;
        const t = richPointerTargetElement(evt);
        if (!t || !this.richEditorEl.contains(t)) return;
        // 早于 contextmenu：WebKit/Electron 常在弹出菜单前清空 Selection，此处仍能克隆选区
        this.captureRichVaultLinkContextSnapshot();
      },
      true
    );
    editor.addEventListener("contextmenu", (evt) => this.handleRichEditorContextMenu(evt), true);

    // 高级编辑区固定放在工具栏下方，避免被挂到页面底部出现错位。
    const containerEl = container as HTMLElement;
    containerEl.classList.add("yori-rich-view-content-flex");
    this.richMountContainerEl = containerEl;
    const anchor = this.toolbarEl?.nextSibling ?? containerEl.firstChild;
    containerEl.insertBefore(host, anchor);
    this.attachRichEditorHeightCap(containerEl, host);

    this.richEditorWrapEl = host;
    this.richEditorEl = editor;
    window.addEventListener("dragend", this.richGlobalDragEndCapture, true);
    this.richHostView = view;
    this.richHostFilePath = view.file?.path ?? null;
    this.syncRichMarkdownSubviewVisibility(view);
    this.richLastMarkdownMode = view.getMode();

    this.updateRichSaveState("saved");
    this.scheduleRichSelectionVisualSync();
    this.loadRichEditorFromNote()
      .catch(() => {
        // 忽略加载异常，保持编辑器可输入
      })
      .finally(() => {
        this.syncRichLineSpacingToolbarState();
        this.scheduleRichEditorHydratePasses();
        this.queueRichMarkdownModeSync();
      });
  }

  private unmountRichEditor(): void {
    this.cleanupRichImageResizeListeners();
    window.removeEventListener("dragend", this.richGlobalDragEndCapture, true);
    this.richInternalDragMediaParagraph = null;
    this.flushRichAutoSaveNow();
    this.closeRichTableContextMenu();
    if (this.richAutoSaveTimer) {
      window.clearTimeout(this.richAutoSaveTimer);
      this.richAutoSaveTimer = null;
    }
    if (this.richSaveWatchdogTimer) {
      window.clearTimeout(this.richSaveWatchdogTimer);
      this.richSaveWatchdogTimer = null;
    }
    if (this.richSelectionSyncTimer) {
      window.clearTimeout(this.richSelectionSyncTimer);
      this.richSelectionSyncTimer = null;
    }
    if (this.richMetadataHydrateTimer != null) {
      window.clearTimeout(this.richMetadataHydrateTimer);
      this.richMetadataHydrateTimer = null;
    }
    if (this.richMarkdownModeSyncTimer != null) {
      window.clearTimeout(this.richMarkdownModeSyncTimer);
      this.richMarkdownModeSyncTimer = null;
    }
    if (this.richReadingResumeTimer != null) {
      window.clearTimeout(this.richReadingResumeTimer);
      this.richReadingResumeTimer = null;
    }
    this.richLastMarkdownMode = null;
    if (this.richLayoutHydrateTimer != null) {
      window.clearTimeout(this.richLayoutHydrateTimer);
      this.richLayoutHydrateTimer = null;
    }
    if (this.richInputHydrateTimer != null) {
      window.clearTimeout(this.richInputHydrateTimer);
      this.richInputHydrateTimer = null;
    }
    clearRichTableSelectionVisual(this.richEditorEl);
    this.richWrapResizeObserver?.disconnect();
    this.richWrapResizeObserver = null;
    this.richMountContainerEl?.classList.remove("yori-rich-view-content-flex");
    this.richMountContainerEl = null;
    this.richEditorWrapEl?.remove();
    this.richEditorWrapEl = null;
    this.richEditorEl = null;
    this.richAlignCurrentIndex = 0;
    this.richContextCell = null;
    this.richDragAnchorCell = null;
    this.richDragFocusCell = null;
    this.richIsTableDragging = false;
    this.richResizeMode = null;
    this.richResizeCell = null;
    this.richResizeColIndex = -1;
    this.richResizeNeighborColIndex = -1;
    this.richResizeNeighborStartSize = 0;
    this.richResizeTableStartWidth = 0;
    this.richIsDirty = false;
    this.resetRichUndoStacks();
    this.richCheckboxFlagsFromLastNoteLoad = null;
    if (this.richHostView) {
      this.setMarkdownViewVisibility(this.richHostView, true);
    }
    this.richHostView = null;
    this.richHostFilePath = null;
  }

  private scheduleRichAutoSave(delay = 500): void {
    if (this.richAutoSaveTimer) {
      window.clearTimeout(this.richAutoSaveTimer);
    }
    this.richAutoSaveTimer = window.setTimeout(() => {
      this.richAutoSaveTimer = null;
      this.persistRichEditor().catch(() => {
        this.updateRichSaveState("error");
        new Notice("高级编辑自动保存失败，请手动保存。");
      });
    }, delay);
  }

  private flushRichAutoSaveNow(): void {
    if (!this.richEditorEl) return;
    if (this.richAutoSaveTimer) {
      window.clearTimeout(this.richAutoSaveTimer);
      this.richAutoSaveTimer = null;
    }
    this.persistRichEditor().catch(() => {
      this.updateRichSaveState("error");
      new Notice("高级编辑切换时保存失败，请手动点击保存。");
    });
  }

  private async persistRichEditor(): Promise<void> {
    if (!this.richIsDirty) {
      this.updateRichSaveState("saved");
      return;
    }
    if (this.richSaveInProgress) {
      this.richSaveQueued = true;
      return;
    }
    const runId = ++this.richSaveRunId;
    const startedAt = Date.now();
    this.richSaveInProgress = true;
    this.updateRichSaveState("saving");
    this.startRichSaveWatchdog(runId);
    try {
      const ok = await this.withTimeout(this.saveRichEditorToNote(), this.richSaveTimeoutMs);
      if (runId !== this.richSaveRunId) return;
      if (!ok) {
        this.updateRichSaveState("unsaved");
        return;
      }
      this.richIsDirty = false;
      this.richLastSavedAt = Date.now();
      this.richLastSaveCostMs = this.richLastSavedAt - startedAt;
      this.updateRichSaveState("saved");
    } catch (error) {
      if (runId === this.richSaveRunId) {
        this.updateRichSaveState("error");
      }
      throw error;
    } finally {
      if (runId === this.richSaveRunId) {
        this.stopRichSaveWatchdog();
        this.richSaveInProgress = false;
        if (this.richSaveQueued) {
          this.richSaveQueued = false;
          this.scheduleRichAutoSave(0);
        }
      }
    }
  }

  private startRichSaveWatchdog(runId: number): void {
    this.stopRichSaveWatchdog();
    this.richSaveWatchdogTimer = window.setTimeout(() => {
      if (runId !== this.richSaveRunId) return;
      this.richSaveInProgress = false;
      this.richSaveQueued = false;
      this.updateRichSaveState("error");
      new Notice("高级编辑保存超时，已停止本次保存。");
    }, this.richSaveTimeoutMs + 1200);
  }

  private stopRichSaveWatchdog(): void {
    if (!this.richSaveWatchdogTimer) return;
    window.clearTimeout(this.richSaveWatchdogTimer);
    this.richSaveWatchdogTimer = null;
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timer: number | null = null;
    const timeoutPromise = new Promise<T>((_, reject) => {
      timer = window.setTimeout(() => {
        reject(new Error("save-timeout"));
      }, timeoutMs);
    });
    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timer != null) {
        window.clearTimeout(timer);
      }
    }
  }

  /**
   * 从多个可能的源笔记路径尝试解析链目标（host / active 任一未及时同步时仍尽量解析）。
   */
  private resolveVaultLinkDestForHydrate(linkPath: string, sourcePathHint?: string): TFile | null {
    return resolveVaultLinkDestFromHydrateSources(
      this.app,
      linkPath,
      buildOrderedHydrateVaultSourcePaths(sourcePathHint, {
        richHostFile: this.getRichHostFile()?.path,
        richHostViewFile: this.richHostView?.file?.path,
        richHostFilePathStored: this.richHostFilePath,
        activeFile: this.app.workspace.getActiveFile()?.path
      })
    );
  }

  /** 用作富文本内 [[…]] / ![[…]] 解析的源笔记路径，避免 host 未就绪时直接跳过整次 hydrate（表现仍为灰色括号、点击无效）。 */
  private resolveHydrationSourcePath(): string {
    return (
      this.getRichHostFile()?.path ??
      this.richHostView?.file?.path ??
      this.app.workspace.getActiveFile()?.path ??
      ""
    );
  }

  private scheduleHydrateRichWikilinksAfterMetadata(): void {
    if (this.settings.toolbarMode !== "rich" || !this.richEditorEl) return;
    if (this.richMetadataHydrateTimer != null) {
      window.clearTimeout(this.richMetadataHydrateTimer);
    }
    this.richMetadataHydrateTimer = window.setTimeout(() => {
      this.richMetadataHydrateTimer = null;
      this.hydrateRichWikilinksInEditor();
    }, 150);
  }

  private scheduleHydrateRichWikilinksAfterLayout(): void {
    if (this.settings.toolbarMode !== "rich" || !this.richEditorEl) return;
    if (this.richLayoutHydrateTimer != null) {
      window.clearTimeout(this.richLayoutHydrateTimer);
    }
    this.richLayoutHydrateTimer = window.setTimeout(() => {
      this.richLayoutHydrateTimer = null;
      this.hydrateRichWikilinksInEditor();
    }, 80);
  }

  /** 随内容变化反复尝试解析 [[…]] / ![[…]]（metadata 常在输入/保存后才就绪，与「按一下回车链接才变」同源） */
  private scheduleHydrateRichWikilinksOnInput(): void {
    if (!this.richEditorEl) return;
    if (this.richInputHydrateTimer != null) {
      window.clearTimeout(this.richInputHydrateTimer);
    }
    this.richInputHydrateTimer = window.setTimeout(() => {
      this.richInputHydrateTimer = null;
      this.hydrateRichWikilinksInEditor();
    }, 100);
  }


  /** 桌面端用系统浏览器打开 http(s) 外链（contenteditable 内默认不会跟随 &lt;a href&gt;）。 */
  private async openRichExternalHttpLink(url: string): Promise<void> {
    const u = url.trim();
    if (!/^https?:\/\//i.test(u)) return;
    try {
      const req = (globalThis as unknown as { require?: (id: string) => unknown }).require;
      if (typeof req === "function") {
        const electron = req("electron") as { shell?: { openExternal?: (x: string) => Promise<void> } } | undefined;
        const openExternal = electron?.shell?.openExternal;
        if (typeof openExternal === "function") {
          await openExternal(u);
          return;
        }
      }
    } catch (e) {
      console.debug("openExternal failed", e);
    }
    try {
      window.open(u, "_blank", "noopener,noreferrer");
    } catch {
      /* ignore */
    }
  }

  /** contenteditable 内打开库内链（与 click 相比：捕获阶段 mousedown 先接管，避免首击只落光标） */
  private openYoriRichInternalLink(il: HTMLAnchorElement, evt: Pick<MouseEvent, "metaKey" | "ctrlKey">): void {
    const lt = il.getAttribute("data-yori-wikilink")?.trim() ?? "";
    if (!lt) return;
    const src = this.resolveHydrationSourcePath();
    const pipe = lt.indexOf("|");
    const linkPath = (pipe >= 0 ? lt.slice(0, pipe) : lt).trim();
    if (!linkPath) return;
    const dest = this.resolveVaultLinkDestForHydrate(linkPath, src);
    if (dest instanceof TFile) {
      const ext = dest.extension.toLowerCase();
      if (ATTACHMENT_PDF_EXTENSIONS.has(ext)) {
        void this.openVaultLinkPerClickPreference(linkPath, src, evt.metaKey || evt.ctrlKey);
        return;
      }
      if (ATTACHMENT_AUDIO_EXTENSIONS.has(ext) || ATTACHMENT_RECORDING_EXTENSIONS.has(ext)) {
        void this.openVaultFileWithSystemDefault(dest).then((ok) => {
          if (!ok) {
            void this.openVaultLinkPerClickPreference(linkPath, src, evt.metaKey || evt.ctrlKey);
          }
        });
        return;
      }
    }
    void this.openVaultLinkPerClickPreference(linkPath, src, evt.metaKey || evt.ctrlKey);
  }

  private async openVaultFileWithSystemDefault(file: TFile): Promise<boolean> {
    try {
      const anyReq = (globalThis as unknown as { require?: (id: string) => unknown }).require;
      if (typeof anyReq === "function") {
        const electron = anyReq("electron") as { shell?: { openPath?: (x: string) => Promise<string> } };
        const openPath = electron?.shell?.openPath;
        if (typeof openPath === "function") {
          const adapter = this.app.vault.adapter as unknown as { getFullPath?: (p: string) => string };
          const fullPath = adapter.getFullPath?.(file.path);
          if (!fullPath) return false;
          const err = await openPath(fullPath);
          if (!err) return true;
        }
      }
    } catch (e) {
      console.debug("openPath failed", e);
    }
    return false;
  }

  /** 打开笔记后多帧补水合，减轻 metadata / 主题变量未就绪时链接样式与命中滞后 */
  private scheduleRichEditorHydratePasses(): void {
    const snap =
      this.richCheckboxFlagsFromLastNoteLoad && this.richCheckboxFlagsFromLastNoteLoad.length > 0
        ? [...this.richCheckboxFlagsFromLastNoteLoad]
        : null;
    const run = (): void => {
      this.hydrateRichWikilinksInEditor();
      if (snap && this.richEditorEl) {
        applyRichCheckboxCheckedFlagsToEditorInTreeOrder(this.richEditorEl, snap);
      }
    };
    run();
    requestAnimationFrame(run);
    requestAnimationFrame(() => {
      requestAnimationFrame(run);
    });
    window.setTimeout(run, 50);
    window.setTimeout(run, 280);
    window.setTimeout(run, 500);
  }

  /** 打开旧笔记时剥掉已废弃的缩放包装层，避免其内文本永远无法再补水合 */
  private stripLegacyRichImageResizeWraps(): void {
    if (!this.richEditorEl) return;
    this.richEditorEl.querySelectorAll(`.${LEGACY_YORI_IMG_RESIZE_WRAP_CLASS}`).forEach((raw) => {
      const wrap = raw as HTMLElement;
      const parent = wrap.parentNode;
      if (!parent) return;
      while (wrap.firstChild) {
        parent.insertBefore(wrap.firstChild, wrap);
      }
      parent.removeChild(wrap);
    });
  }

  private embedHydrateHost(): EmbedHydrateInTextNodeHost {
    return {
      parseNumericEmbedWidthSuffix: (s) => this.parseNumericEmbedWidthSuffix(s),
      resolveVaultLinkDestForHydrate: (linkPath, hint) => this.resolveVaultLinkDestForHydrate(linkPath, hint),
      vaultResourcePath: (f) => this.app.vault.getResourcePath(f),
      wrapRichMediaBlock: (m) => this.wrapRichMediaBlock(m),
      wrapRichImageWithResizeHost: (img) => this.wrapRichImageWithResizeHost(img),
      createRichGenericFileEmbed: (dest, raw) => this.createRichGenericFileEmbed(dest, raw),
      schedulePdfEmbedSizing: (box, file) => {
        void this.sizeRichPdfEmbedToPageAspect(box, file);
      }
    };
  }

  /** 高级编辑加载后：先把 `![[...]]` 转成图片，再把 `[[wikilink]]` 转成内链；落盘见 save 前 dehydrate。 */
  private hydrateRichWikilinksInEditor(): void {
    if (!this.richEditorEl) return;
    this.stripLegacyRichImageResizeWraps();
    const sourcePath = this.resolveHydrationSourcePath();
    const commonReject = (node: Node): boolean => {
      const p = node.parentElement;
      if (!p || !this.richEditorEl?.contains(p)) return true;
      const inOtherAnchor = p.closest("a");
      if (inOtherAnchor && !inOtherAnchor.classList.contains("internal-link")) return true;
      if (p.closest("a.internal-link[data-yori-wikilink]")) return true;
      if (p.tagName === "SCRIPT" || p.tagName === "STYLE" || p.tagName === "CODE") return true;
      return false;
    };

    const acceptImageEmbeds = (node: Node): number => {
      if (commonReject(node)) return NodeFilter.FILTER_REJECT;
      const v = node.nodeValue;
      return v && /!\[\[[^\]]+\]\]/.test(v) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    };
    const w1 = document.createTreeWalker(this.richEditorEl, NodeFilter.SHOW_TEXT, {
      acceptNode: acceptImageEmbeds
    });
    const imgBatch: Text[] = [];
    let n1: Node | null;
    while ((n1 = w1.nextNode())) imgBatch.push(n1 as Text);
    const embedHost = this.embedHydrateHost();
    for (const textNode of imgBatch) {
      replaceImageEmbedsInTextNode(textNode, sourcePath, true, embedHost);
    }

    const acceptWiki = (node: Node): number => {
      if (commonReject(node)) return NodeFilter.FILTER_REJECT;
      const v = node.nodeValue;
      return v && v.includes("[[") && /(?<!\!)\[\[[^\[\]]+\]\]/.test(v)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    };
    const walker2 = document.createTreeWalker(this.richEditorEl, NodeFilter.SHOW_TEXT, {
      acceptNode: acceptWiki
    });
    const wikiBatch: Text[] = [];
    let n2: Node | null;
    while ((n2 = walker2.nextNode())) {
      wikiBatch.push(n2 as Text);
    }
    for (const textNode of wikiBatch) {
      replaceWikilinksInTextNodeForHydrate(textNode, sourcePath, embedHost);
    }
    this.ensureRichSpacerAfterMediaParagraphs();
    this.dedupeRedundantRichWikiTextAfterMediaBlocks();
    this.ensureRichTrailingParagraph();
    hydrateRichInlineTagsInRichEditor(this.richEditorEl);
    this.applyRichCaretAfterVaultWikiInsertIfPending();
  }

  /**
   * 用 PDF.js 读取首页版面尺寸，设置外框 aspect-ratio 与 max-height，使边框比例贴近实际纸张；失败则保留 CSS 默认高度。
   */
  private async sizeRichPdfEmbedToPageAspect(box: HTMLElement, file: TFile): Promise<void> {
    const iframe = box.querySelector("iframe.yori-rich-pdf-iframe") as HTMLIFrameElement | null;
    if (!iframe) return;
    try {
      const pdfjsLib = await loadPdfJs();
      const data = await this.app.vault.readBinary(file);
      if (!box.isConnected) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      }
      if (!box.isConnected) return;
      const loadingTask = pdfjsLib.getDocument({ data });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1 });
      const pw = viewport.width;
      const ph = viewport.height;
      if (!(pw > 0 && ph > 0) || !Number.isFinite(pw) || !Number.isFinite(ph)) return;
      box.style.aspectRatio = `${pw} / ${ph}`;
      box.style.width = "100%";
      box.style.maxWidth = "100%";
      box.style.maxHeight = "min(88vh, 960px)";
      box.style.height = "auto";
      box.classList.add("yori-rich-pdf-embed--sized");
    } catch {
      /* 加密/损坏/解析失败：沿用未加 --sized 时的 CSS */
    }
  }

  /** 切到高级编辑前稍等两帧，让 CodeMirror 把刚改的正文（如 checked 属性）刷进缓冲区。 */
  private async coalesceMarkdownBufferBeforeRichLoad(): Promise<void> {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });
  }

  private async readNoteRawForYori(file: TFile): Promise<string> {
    const live = getLiveMarkdownRawForFile(this.app, file, this.richHostView);
    if (live != null) return live;
    return await this.app.vault.read(file);
  }

  private async loadRichEditorFromNote(): Promise<void> {
    const file = this.getRichHostFile();
    if (!file || !this.richEditorEl) return;
    this.richCheckboxFlagsFromLastNoteLoad = null;
    await this.coalesceMarkdownBufferBeforeRichLoad();
    const raw = await this.readNoteRawForYori(file);
    const { frontmatter, body } = splitLeadingYamlFrontmatter(raw);
    const { prefix, inner, suffix } = splitNoteAroundRichBlock(this.richBlockStart, this.richBlockEnd, body);

    let mergedHtml: string;
    let needsConsolidate = false;

    if (inner != null) {
      const pre = prefix.trim();
      const suf = suffix.trim();
      const innerForEditor = yoriRichInnerLoadAsRawHtml(inner)
        ? inner
        : markdownToInitialRichHtml(inner);
      if (pre !== "" || suf !== "") {
        needsConsolidate = true;
        mergedHtml =
          (pre !== "" ? markdownToInitialRichHtml(pre) : "") +
          innerForEditor +
          (suf !== "" ? markdownToInitialRichHtml(suf) : "");
      } else {
        mergedHtml = innerForEditor;
      }
    } else {
      mergedHtml = markdownToInitialRichHtml(body);
    }

    const checkboxFlags = extractRichCheckboxCheckedFlagsFromHtmlFragment(mergedHtml);
    this.richCheckboxFlagsFromLastNoteLoad =
      checkboxFlags.length > 0 ? [...checkboxFlags] : null;

    this.richEditorEl.innerHTML = mergedHtml;
    applyRichCheckboxCheckedStateFromAttributesAfterLoad(this.richEditorEl);
    applyRichCheckboxCheckedFlagsToEditorInTreeOrder(this.richEditorEl, checkboxFlags);
    const unwrapChanged = unwrapRichParagraphsWrappingDirectLists(this.richEditorEl);
    const strayCloseStripped = stripRichStrayParagraphCloseTagTextNodes(this.richEditorEl);
    this.normalizeRichBorderedFramesAfterLoad();
    this.normalizeAllRichTables();
    const taskListDiskNeedsSave = this.normalizeRichTaskListClassesAfterLoad();
    applyRichCheckboxCheckedFlagsToEditorInTreeOrder(this.richEditorEl, checkboxFlags);
    this.ensureRichTrailingParagraph();
    this.resetRichUndoStacks();
    this.richIsDirty = taskListDiskNeedsSave || strayCloseStripped || unwrapChanged;
    this.updateRichSaveState(this.richIsDirty ? "unsaved" : "saved");
    this.hydrateRichWikilinksInEditor();
    applyRichCheckboxCheckedFlagsToEditorInTreeOrder(this.richEditorEl, checkboxFlags);

    if (needsConsolidate) {
      await this.persistConsolidatedRichBodyToDisk(file, frontmatter);
    }
  }

  private async saveRichEditorToNote(): Promise<boolean> {
    const file = this.getRichHostFile();
    if (!file || !this.richEditorEl) return false;
    const clone = this.richEditorEl.cloneNode(true) as HTMLElement;
    this.dehydrateRichEditorDomForSave(clone);
    const innerStored = pickYoriInnerStorageFromDehydratedClone(clone);
    const raw = await this.readNoteRawForYori(file);
    const { frontmatter } = splitLeadingYamlFrontmatter(raw);
    const next = composeNoteWithFrontmatterAndRichBlock(this.richBlockStart, this.richBlockEnd, frontmatter, innerStored);
    const norm = (s: string): string => s.replace(/\r\n/g, "\n");
    if (norm(next) !== norm(raw)) {
      await this.app.vault.modify(file, next);
    }
    return true;
  }

  /**
   * 高级表格多格拖选会清掉 document selection，仍依赖 dragAnchor/Focus；
   * 离开高级模式时据此在源码里恢复等价选区。
   */
  private getRichTableCellsForNativeSelectionRestore(): HTMLTableCellElement[] {
    if (!this.richEditorEl) return [];
    const cur = this.getCurrentRichTableCell();
    if (!cur) return [];
    const tbl = cur.closest("table") as HTMLTableElement | null;
    if (!tbl || !this.richEditorEl.contains(tbl)) return [];

    const fromDrag = getDraggedRichTableCellsFromAnchors(
      tbl,
      this.richDragAnchorCell,
      this.richDragFocusCell,
      this.richIsTableDragging
    );
    if (fromDrag.length > 0) {
      return orderRichTableCellsReadingOrder(tbl, fromDrag);
    }

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      const rectCells = this.getSelectedRichTableCells(tbl);
      if (rectCells.length > 0) {
        return orderRichTableCellsReadingOrder(tbl, rectCells);
      }
    }

    return [cur];
  }

  private mapLiveTableCellToDehydratedClone(
    clone: HTMLElement,
    liveCell: HTMLTableCellElement
  ): HTMLTableCellElement | null {
    const liveTable = liveCell.closest("table") as HTMLTableElement | null;
    if (!liveTable || !this.richEditorEl?.contains(liveTable)) return null;
    const tables = Array.from(this.richEditorEl.querySelectorAll("table"));
    const ti = tables.indexOf(liveTable);
    if (ti < 0) return null;
    const cloneTables = Array.from(clone.querySelectorAll("table"));
    const cTable = cloneTables[ti] as HTMLTableElement | undefined;
    if (!cTable) return null;
    const model = buildRichTableGrid(liveTable);
    const pos = model.origins.get(liveCell);
    if (!pos) return null;
    return getOriginCellByGridPosition(cTable, pos.row, pos.col);
  }

  /** 在脱水后的 inner 串中算出应对齐到源码的选区（整格 &lt;td&gt;/&lt;th&gt; 闭区间）。 */
  private computeRichInnerSelectionRangeForNativeRestore(): { from: number; to: number } | null {
    if (!this.richEditorEl) return null;
    const ordered = this.getRichTableCellsForNativeSelectionRestore();
    if (ordered.length === 0) return null;

    const MARK_A = "<!--yori-native-sel-a-->";
    const MARK_B = "<!--yori-native-sel-b-->";

    const clone = this.richEditorEl.cloneNode(true) as HTMLElement;
    this.dehydrateRichEditorDomForSave(clone);

    const cFirst = this.mapLiveTableCellToDehydratedClone(clone, ordered[0]);
    const cLast = this.mapLiveTableCellToDehydratedClone(clone, ordered[ordered.length - 1]);
    if (!cFirst || !cLast) return null;

    cFirst.insertBefore(document.createComment("yori-native-sel-a"), cFirst.firstChild);
    cLast.appendChild(document.createComment("yori-native-sel-b"));

    const marked = pickYoriInnerStorageFromDehydratedClone(clone);
    const iA = marked.indexOf(MARK_A);
    const iB = marked.indexOf(MARK_B);
    if (iA < 0 || iB < 0 || iB <= iA) return null;

    const innerClean = marked.slice(0, iA) + marked.slice(iA + MARK_A.length, iB) + marked.slice(iB + MARK_B.length);
    let from = iA;
    let to = iB - MARK_A.length;
    const exp = expandRichInnerHtmlSelectionToCellTags(innerClean, from, to);
    from = exp.from;
    to = exp.to;
    if (from >= to || to > innerClean.length) return null;
    return { from, to };
  }

  private applyNativeEditorSelectionForYoriInnerRange(
    view: MarkdownView,
    innerFrom: number,
    innerTo: number
  ): void {
    if (innerFrom >= innerTo) return;
    const editor = view.editor;
    const raw = editor.getValue();
    const n = raw.replace(/\r\n/g, "\n");
    const { frontmatter, body } = splitLeadingYamlFrontmatter(n);
    const innerStart = getYoriRichInnerContentStartInBody(this.richBlockStart, this.richBlockEnd, body);
    if (innerStart == null) return;
    const docBase = frontmatter.length + innerStart;
    const docFrom = docBase + innerFrom;
    const docTo = docBase + innerTo;
    if (docFrom < 0 || docTo > n.length || docFrom >= docTo) return;
    try {
      editor.setSelection(editor.offsetToPos(docFrom), editor.offsetToPos(docTo));
    } catch {
      /* ignore */
    }
  }

  private getRichHostFile(): TFile | null {
    const fallback = this.richHostView?.file;
    if (!this.richHostFilePath) {
      return fallback ?? null;
    }
    const abs = this.app.vault.getAbstractFileByPath(this.richHostFilePath);
    if (abs instanceof TFile) return abs;
    return fallback ?? null;
  }

  /**
   * 高级编辑：按 Markdown 视图模式切换源码区 / 预览区 / 富文本外壳的显隐。
   * 阅读模式需显示 `.markdown-preview-view`；若一直保持「预览 display:none」会出现预览高度异常。
   */
  private syncRichMarkdownSubviewVisibility(view: MarkdownView): void {
    if (this.settings.toolbarMode !== "rich") return;
    if (this.richHostView !== view || !this.richEditorWrapEl) return;

    const sourceView = view.containerEl.querySelector(".markdown-source-view") as HTMLElement | null;
    const sourceEditor = view.containerEl.querySelector(".cm-editor") as HTMLElement | null;
    const preview = view.containerEl.querySelector(".markdown-preview-view") as HTMLElement | null;

    if (view.getMode() === "preview") {
      if (sourceView) sourceView.style.display = "none";
      if (sourceEditor) sourceEditor.style.display = "none";
      if (preview) preview.style.display = "";
      this.richEditorWrapEl.style.display = "none";
    } else {
      if (sourceView) sourceView.style.display = "none";
      if (sourceEditor) sourceEditor.style.display = "none";
      if (preview) preview.style.display = "none";
      this.richEditorWrapEl.style.display = "";
      const c = this.richMountContainerEl;
      if (c) this.applyRichWrapMaxHeight(c, this.richEditorWrapEl);
    }
  }

  private queueRichMarkdownModeSync(): void {
    if (this.settings.toolbarMode !== "rich") return;
    if (this.richMarkdownModeSyncTimer != null) window.clearTimeout(this.richMarkdownModeSyncTimer);
    this.richMarkdownModeSyncTimer = window.setTimeout(() => {
      this.richMarkdownModeSyncTimer = null;
      const view = this.getActiveMarkdownView();
      if (!view || this.richHostView !== view) return;
      const prev = this.richLastMarkdownMode;
      const mode = view.getMode();
      this.syncRichMarkdownSubviewVisibility(view);
      if (mode === "source" && prev === "preview") {
        this.scheduleRichResumeAfterReadingMode();
      }
      this.richLastMarkdownMode = mode;
    }, 50);
  }

  /** 预览 → 编辑：重算高度、刷新边界装饰与正文（与手动刷新 Obsidian 相近） */
  private scheduleRichResumeAfterReadingMode(): void {
    if (this.richReadingResumeTimer != null) window.clearTimeout(this.richReadingResumeTimer);
    this.richReadingResumeTimer = window.setTimeout(() => {
      this.richReadingResumeTimer = null;
      const view = this.getActiveMarkdownView();
      if (!view || !this.richEditorEl || !this.richEditorWrapEl || !this.richMountContainerEl) return;
      if (this.richHostView !== view || view.getMode() !== "source") return;
      this.applyRichWrapMaxHeight(this.richMountContainerEl, this.richEditorWrapEl);
      this.bumpRichBoundaryDecorations();
      if (!this.richIsDirty) {
        void this.loadRichEditorFromNote()
          .catch(() => {
            /* ignore */
          })
          .finally(() => {
            this.syncRichLineSpacingToolbarState();
            this.scheduleRichEditorHydratePasses();
          });
      } else {
        this.scheduleRichEditorHydratePasses();
      }
    }, 120);
  }

  private setMarkdownViewVisibility(view: MarkdownView, visible: boolean): void {
    const sourceView = view.containerEl.querySelector(".markdown-source-view") as HTMLElement | null;
    if (sourceView) {
      sourceView.style.display = visible ? "" : "none";
    }
    const sourceEditor = view.containerEl.querySelector(".cm-editor") as HTMLElement | null;
    if (sourceEditor) {
      sourceEditor.style.display = visible ? "" : "none";
    }
    const preview = view.containerEl.querySelector(".markdown-preview-view") as HTMLElement | null;
    if (preview) {
      preview.style.display = visible ? "" : "none";
    }
  }

  private markRichDirty(): void {
    this.richIsDirty = true;
    this.updateRichSaveState("unsaved");
  }

  private updateRichSaveState(state: "saved" | "unsaved" | "saving" | "error"): void {
    // 按需静默：仅失败时通过 Notice 提示，日常不显示状态文字。
    if (state === "error") {
      // no-op, 失败提示由调用方统一 Notice。
    }
  }

  private async persistConsolidatedRichBodyToDisk(file: TFile, frontmatter: string): Promise<void> {
    if (!this.richEditorEl) return;
    const clone = this.richEditorEl.cloneNode(true) as HTMLElement;
    this.dehydrateRichEditorDomForSave(clone);
    const innerStored = pickYoriInnerStorageFromDehydratedClone(clone);
    const next = composeNoteWithFrontmatterAndRichBlock(this.richBlockStart, this.richBlockEnd, frontmatter, innerStored);
    await this.app.vault.modify(file, next);
    this.richIsDirty = false;
    this.updateRichSaveState("saved");
  }

  private dehydrateRichEditorDomForSave(root: HTMLElement): void {
    runRichDehydrateEditorDomForSave(root);
  }

  private attachRichEditorHeightCap(container: HTMLElement, wrap: HTMLElement): void {
    this.richWrapResizeObserver?.disconnect();
    const ro = new ResizeObserver(() => {
      this.applyRichWrapMaxHeight(container, wrap);
    });
    this.richWrapResizeObserver = ro;
    ro.observe(container);
    this.applyRichWrapMaxHeight(container, wrap);
  }

  private applyRichWrapMaxHeight(container: HTMLElement, wrap: HTMLElement): void {
    if (wrap.style.display === "none") return;
    const bar = this.toolbarEl;
    const hBar = bar?.isConnected ? bar.offsetHeight : 52;
    const pad = 24;
    const avail = Math.floor(container.clientHeight - hBar - pad);
    const cap = Math.max(220, avail);
    wrap.style.maxHeight = `${cap}px`;
  }

  /** 光标是否落在块级内容的最开头（用于「上一块是媒体时整体删除上一块」） */
  private isCaretAtRichBlockVisualStart(sel: globalThis.Selection, block: HTMLElement): boolean {
    if (!sel.isCollapsed || !this.richEditorEl?.contains(block)) return false;
    const startContainer = sel.anchorNode;
    const startOffset = sel.anchorOffset;
    if (!startContainer) return false;
    if (startContainer === block && startContainer.nodeType === Node.ELEMENT_NODE) {
      return startOffset === 0;
    }
    if (startContainer.nodeType === Node.TEXT_NODE) {
      if (startOffset > 0) return false;
      let n: Node | null = startContainer;
      while (n && n !== block) {
        if (n.previousSibling) return false;
        n = n.parentNode;
      }
      return n === block;
    }
    return false;
  }

  /**
   * 插入 &lt;hr&gt; 后若存在仅占位的空段，在段首退格时浏览器会误删分隔线。
   * 改为删除该空段，并把光标落到下一段开头或分隔线之后。
   */
  private tryDeleteRichSpacerParagraphAfterHrBackward(evt: InputEvent): boolean {
    if (evt.inputType !== "deleteContentBackward" || !this.richEditorEl) return false;
    const sel = window.getSelection();
    if (!sel?.isCollapsed) return false;

    const block = this.findClosestRichBlock(sel.anchorNode);
    if (!block || block.tagName !== "P" || !this.richEditorEl.contains(block)) return false;
    const pBlock = block as HTMLParagraphElement;
    if (!this.isRichSkippableEmptyParagraph(pBlock)) return false;
    if (!this.isCaretAtEmptyParagraphStartForHrBackspace(sel, pBlock)) return false;

    const prev = block.previousElementSibling;
    if (!prev || prev.tagName !== "HR") return false;

    evt.preventDefault();
    this.rememberRichStateForUndo();
    const next = pBlock.nextElementSibling;

    pBlock.remove();

    const s = window.getSelection();
    if (s) {
      const r = document.createRange();
      if (
        next &&
        next.tagName === "P" &&
        this.richEditorEl.contains(next) &&
        !next.classList.contains(YORI_RICH_MEDIA_PARAGRAPH_CLASS)
      ) {
        r.setStart(next, 0);
        r.collapse(true);
      } else {
        r.setStartAfter(prev);
        r.collapse(true);
      }
      s.removeAllRanges();
      s.addRange(r);
    }

    this.markRichDirty();
    this.scheduleRichAutoSave();
    this.ensureRichTrailingParagraph();
    this.scheduleHydrateRichWikilinksOnInput();
    return true;
  }

  /** 空段落在分隔线之后时，判定退格是否应「吃空行」而非删 &lt;hr&gt;。 */
  private isCaretAtEmptyParagraphStartForHrBackspace(sel: Selection, p: HTMLParagraphElement): boolean {
    if (this.isCaretAtRichBlockVisualStart(sel, p)) return true;
    const n = sel.anchorNode;
    if (n?.nodeName === "BR" && n.parentNode === p) {
      return sel.anchorOffset === 0 && !n.previousSibling;
    }
    return false;
  }

  private tryDeleteRichAtomicEmbedBackward(evt: InputEvent): boolean {
    if (evt.inputType !== "deleteContentBackward" || !this.richEditorEl) return false;
    const sel = window.getSelection();
    if (!sel?.isCollapsed) return false;

    const anchor = sel.anchorNode;
    const genericHost =
      anchor instanceof Element
        ? anchor.closest(".yori-rich-generic-embed")
        : anchor?.parentElement?.closest(".yori-rich-generic-embed");
    if (genericHost && this.richEditorEl.contains(genericHost)) {
      evt.preventDefault();
      this.rememberRichStateForUndo();
      const mp = genericHost.closest(`.${YORI_RICH_MEDIA_PARAGRAPH_CLASS}`);
      if (mp && this.richEditorEl.contains(mp)) {
        mp.remove();
      } else {
        genericHost.remove();
      }
      this.markRichDirty();
      this.scheduleRichAutoSave();
      this.ensureRichTrailingParagraph();
      this.scheduleHydrateRichWikilinksOnInput();
      return true;
    }

    const block = this.findClosestRichBlock(sel.anchorNode);
    if (!block || !this.richEditorEl.contains(block)) return false;
    const prev = block.previousElementSibling;
    if (!prev?.classList.contains(YORI_RICH_MEDIA_PARAGRAPH_CLASS)) return false;
    if (!this.isCaretAtRichBlockVisualStart(sel, block)) return false;
    evt.preventDefault();
    this.rememberRichStateForUndo();
    prev.remove();
    this.markRichDirty();
    this.scheduleRichAutoSave();
    this.ensureRichTrailingParagraph();
    this.scheduleHydrateRichWikilinksOnInput();
    return true;
  }

  private ensureRichSpacerAfterMediaParagraphs(): void {
    if (!this.richEditorEl) return;
    this.richEditorEl.querySelectorAll(`.${YORI_RICH_MEDIA_PARAGRAPH_CLASS}`).forEach((p) => {
      const next = p.nextElementSibling;
      if (next?.classList.contains(YORI_RICH_MEDIA_PARAGRAPH_CLASS)) {
        const spacer = document.createElement("p");
        spacer.innerHTML = "<br>";
        p.insertAdjacentElement("afterend", spacer);
        return;
      }
      if (next && next.tagName === "P" && !next.classList.contains(YORI_RICH_MEDIA_PARAGRAPH_CLASS)) return;
      if (!next || next.tagName !== "P") {
        const spacer = document.createElement("p");
        spacer.innerHTML = "<br>";
        p.insertAdjacentElement("afterend", spacer);
      }
    });
  }

  private getRichMediaParagraphEmbedRaw(mp: Element): string | null {
    const img = mp.querySelector("img[data-yori-image-embed]");
    if (img) return img.getAttribute("data-yori-image-embed");
    const video = mp.querySelector("video[data-yori-video-embed]");
    if (video) return video.getAttribute("data-yori-video-embed");
    const audio = mp.querySelector("audio[data-yori-audio-embed]");
    if (audio) return audio.getAttribute("data-yori-audio-embed");
    const pdf = mp.querySelector(".yori-rich-pdf-embed[data-yori-pdf-embed]");
    if (pdf) return pdf.getAttribute("data-yori-pdf-embed");
    const fileEmb = mp.querySelector("[data-yori-file-embed]");
    if (fileEmb) return fileEmb.getAttribute("data-yori-file-embed");
    return null;
  }

  private isRichParagraphOnlyExactWikiText(p: HTMLElement, wiki: string): boolean {
    const t = (p.textContent ?? "").replace(/\u200b/g, "").replace(/\s+/g, " ").trim();
    return t === wiki;
  }

  private isRichSkippableEmptyParagraph(p: HTMLElement): boolean {
    return ((p.textContent ?? "").replace(/\u200b/g, "").trim()).length === 0;
  }

  /**
   * 原生区拖入与高级区补水合迭加后，易出现「已渲染嵌入 + 紧跟同文件的 ![[…]] 纯文本」；
   * 删掉仅含该语法的段落，否则高级里删图后磁盘上仍有一份链接，回到原生又会显示图。
   */
  private dedupeRedundantRichWikiTextAfterMediaBlocks(): void {
    if (!this.richEditorEl) return;
    for (const mp of Array.from(this.richEditorEl.querySelectorAll(`.${YORI_RICH_MEDIA_PARAGRAPH_CLASS}`))) {
      const raw = this.getRichMediaParagraphEmbedRaw(mp);
      if (!raw) continue;
      const expected = `![[${raw}]]`;
      let sib: Element | null = mp.nextElementSibling;
      while (sib) {
        if (sib.classList.contains(YORI_RICH_MEDIA_PARAGRAPH_CLASS)) break;
        if (sib instanceof HTMLElement && sib.tagName === "P") {
          if (this.isRichParagraphOnlyExactWikiText(sib, expected)) {
            const rm = sib;
            sib = sib.nextElementSibling;
            rm.remove();
            continue;
          }
          if (this.isRichSkippableEmptyParagraph(sib)) {
            sib = sib.nextElementSibling;
            continue;
          }
        }
        break;
      }
    }
  }

  private applyParagraphAlignment(editor: Editor, align: "left" | "center" | "right"): void {
    const range = this.getSelectionOrCurrentLineRange(editor);
    const cleaned = range.text
      .replace(/<div\s+style="text-align:\s*(left|center|right);?">/gi, "")
      .replace(/<\/div>/gi, "");
    const replacement =
      align === "left" ? cleaned : `<div style="text-align:${align};">${cleaned}</div>`;
    this.replaceRangeAndReselect(editor, range.from, range.to, replacement, align === "left" ? 0 : 1);
  }

  private applyLineSpacing(editor: Editor, lineHeight: string): void {
    const range = this.getSelectionOrCurrentLineRange(editor);
    const openTag = `<div style="line-height:${lineHeight};">`;
    const trimmed = range.text.trim();
    const isSameWrapped = trimmed.startsWith(openTag) && trimmed.endsWith("</div>");
    const cleaned = range.text
      .replace(/<div\s+style="line-height:\s*[^"]*;?">/gi, "")
      .replace(/<\/div>/gi, "");
    const replacement = isSameWrapped ? cleaned : `${openTag}${cleaned}</div>`;
    this.replaceRangeAndReselect(editor, range.from, range.to, replacement, isSameWrapped ? 0 : 1);
  }

  private toggleParagraphBorder(editor: Editor): void {
    const range = this.getSelectionOrCurrentLineRange(editor);
    const openTag = `<div style="border:1px solid #af9165;padding:8px 10px;border-radius:4px;">`;
    const legacyOpenTag = `<div style="border:1px solid #af9165;padding:6px 8px;border-radius:4px;">`;
    const trimmed = range.text.trim();
    const isWrapped =
      (trimmed.startsWith(openTag) || trimmed.startsWith(legacyOpenTag)) && trimmed.endsWith("</div>");
    const cleaned = range.text
      .replace(/<div\s+style="border:1px solid #af9165;padding:(?:6px 8px|8px 10px);border-radius:4px;">/gi, "")
      .replace(/<\/div>/gi, "");
    const replacement = isWrapped ? cleaned : `${openTag}${cleaned}</div>`;
    this.replaceRangeAndReselect(editor, range.from, range.to, replacement, isWrapped ? 0 : 1);
  }

  private getSelectionOrCurrentLineRange(editor: Editor): { text: string; from: { line: number; ch: number }; to: { line: number; ch: number } } {
    const from = editor.getCursor("from");
    const to = editor.getCursor("to");
    const hasSelection = from.line !== to.line || from.ch !== to.ch;
    if (hasSelection) {
      return {
        text: editor.getSelection() || editor.getRange(from, to),
        from: { line: from.line, ch: from.ch },
        to: { line: to.line, ch: to.ch }
      };
    }
    const cursor = editor.getCursor();
    const lineText = editor.getLine(cursor.line);
    return {
      text: lineText,
      from: { line: cursor.line, ch: 0 },
      to: { line: cursor.line, ch: lineText.length }
    };
  }

  private replaceRangeAndReselect(
    editor: Editor,
    from: { line: number; ch: number },
    to: { line: number; ch: number },
    replacement: string,
    wrapperMode: 0 | 1
  ): void {
    editor.replaceRange(replacement, from, to);
    const startOffset = editor.posToOffset(from);
    if (wrapperMode === 0) {
      editor.setSelection(from, editor.offsetToPos(startOffset + replacement.length));
      return;
    }
    const firstClose = replacement.indexOf(">");
    const lastOpen = replacement.lastIndexOf("</");
    const contentStart = firstClose >= 0 ? startOffset + firstClose + 1 : startOffset;
    const contentEnd = lastOpen >= 0 ? startOffset + lastOpen : startOffset + replacement.length;
    editor.setSelection(editor.offsetToPos(contentStart), editor.offsetToPos(Math.max(contentStart, contentEnd)));
  }

  private wrapSelectionBasic(editor: Editor, before: string, after: string): void {
    const selectionFrom = editor.getCursor("from");
    const selectionTo = editor.getCursor("to");
    const hasRangeSelection =
      selectionFrom.line !== selectionTo.line || selectionFrom.ch !== selectionTo.ch;

    let selected = editor.getSelection();
    if (!selected && hasRangeSelection) {
      selected = editor.getRange(selectionFrom, selectionTo);
    }

    if (selected) {
      const from = selectionFrom;
      const to = selectionTo;
      if (selected.startsWith(before) && selected.endsWith(after)) {
        const unwrapped = selected.slice(before.length, selected.length - after.length);
        editor.replaceRange(unwrapped, from, to);
        editor.setSelection(from, editor.offsetToPos(editor.posToOffset(from) + unwrapped.length));
        return;
      }

      editor.replaceRange(`${before}${selected}${after}`, from, to);
      const wrappedStart = editor.offsetToPos(editor.posToOffset(from) + before.length);
      const wrappedEnd = editor.offsetToPos(editor.posToOffset(wrappedStart) + selected.length);
      editor.setSelection(wrappedStart, wrappedEnd);
      return;
    }

    const from = editor.getCursor("from");
    editor.replaceSelection(`${before}${after}`);
    editor.setCursor({ line: from.line, ch: from.ch + before.length });
  }

  private toggleLinePrefix(editor: Editor, prefix: string): void {
    const text = this.getSelectedOrLine(editor);
    const lines = text.split("\n");
    const allPrefixed = lines.every((line) => line.startsWith(prefix));
    const next = lines
      .map((line) => {
        if (!line.trim()) return line;
        return allPrefixed ? line.slice(prefix.length) : `${prefix}${line}`;
      })
      .join("\n");
    editor.replaceSelection(next);
  }

  private toggleNumberedList(editor: Editor): void {
    const text = this.getSelectedOrLine(editor);
    const lines = text.split("\n");
    const orderedPattern = /^\d+\.\s/;
    const allNumbered = lines.every((line) => !line.trim() || orderedPattern.test(line));
    const next = lines
      .map((line, idx) => {
        if (!line.trim()) return line;
        return allNumbered ? line.replace(orderedPattern, "") : `${idx + 1}. ${line}`;
      })
      .join("\n");
    editor.replaceSelection(next);
  }

  private applyNativeLikeTaskList(editor: Editor): void {
    const from = editor.getCursor("from");
    const to = editor.getCursor("to");
    const hasRange = from.line !== to.line || from.ch !== to.ch;

    if (hasRange) {
      const selected = editor.getSelection() || editor.getRange(from, to);
      const lines = selected.split("\n");
      const next = lines.map((line) => this.toTaskListItem(line)).join("\n");
      editor.replaceSelection(next);
      return;
    }

    const line = editor.getLine(from.line);
    const nextLine = this.toTaskListItem(line);
    editor.setLine(from.line, nextLine);
  }

  private toTaskListItem(line: string): string {
    if (/^\s*-\s+\[[^\]]+\]\s+/.test(line)) {
      return line;
    }
    const quotePrefix = (line.match(/^(\s*>+\s*)/)?.[0] ?? "");
    const rest = line.slice(quotePrefix.length);
    const indent = rest.match(/^\s*/)?.[0] ?? "";
    const body = rest.slice(indent.length);

    const ul = body.match(/^(-|\*|\+)\s+(.*)$/);
    if (ul) return `${quotePrefix}${indent}- [ ] ${ul[2]}`;
    const ordered = body.match(/^\d+\.\s+(.*)$/);
    if (ordered) return `${quotePrefix}${indent}- [ ] ${ordered[1]}`;
    if (!body.trim()) return `${quotePrefix}${indent}- [ ] `;
    return `${quotePrefix}${indent}- [ ] ${body}`;
  }

  private insertFootnote(editor: Editor): void {
    const selected = editor.getSelection();
    const cursor = editor.getCursor();
    const index = cursor.line + 1;
    const ref = `[^${index}]`;
    if (selected) {
      editor.replaceSelection(`${selected}${ref}`);
    } else {
      editor.replaceSelection(`脚注内容${ref}`);
    }
    editor.replaceSelection(`\n\n${ref}: `);
  }

  private insertBlockquote(editor: Editor): void {
    const text = this.getSelectedOrLine(editor);
    const lines = text.split("\n");
    const prefixed = lines.map((line) => (line.trim() ? `> ${line}` : line)).join("\n");
    editor.replaceSelection(prefixed);
  }

  private getSelectedOrLine(editor: Editor): string {
    const selected = editor.getSelection();
    if (selected) return selected;
    const cursor = editor.getCursor();
    return editor.getLine(cursor.line);
  }

  async loadSettings(): Promise<void> {
    const raw = await this.loadData();
    const loaded = { ...(raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}) };
    const legacy = loaded.dragDroppedVaultNoteOpenMode;
    if (
      typeof legacy === "string" &&
      (legacy === "smart" || legacy === "new-tab" || legacy === "current-tab") &&
      typeof loaded.vaultLinkClickOpenMode !== "string"
    ) {
      loaded.vaultLinkClickOpenMode = legacy;
    }
    delete loaded.dragDroppedVaultNoteOpenMode;
    this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded) as YoriEditorSettings;
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    this.bumpRichBoundaryDecorations();
    this.mountToolbar();
  }

  onunload(): void {
    if (this.markdownFontToolbarSyncRaf) {
      window.cancelAnimationFrame(this.markdownFontToolbarSyncRaf);
      this.markdownFontToolbarSyncRaf = 0;
    }
    this.toolbarLayoutObserver?.disconnect();
    this.toolbarLayoutObserver = null;
    this.unmountRichEditor();
    this.toolbarEl?.remove();
    this.toolbarEl = null;
    this.attachmentFileInputEl?.remove();
    this.attachmentFileInputEl = null;
  }

  async setToolbarMode(mode: ToolbarMode): Promise<boolean> {
    if (this.settings.toolbarMode === mode) return true;
    const nativeTableSel =
      this.settings.toolbarMode === "rich" && mode !== "rich" && this.richEditorEl
        ? this.computeRichInnerSelectionRangeForNativeRestore()
        : null;
    if (this.settings.toolbarMode === "rich") {
      try {
        if (this.richEditorEl && normalizeRichTaskListDom(this.richEditorEl)) {
          this.markRichDirty();
        }
        await this.persistRichEditor();
        if (this.richEditorEl) {
          await this.saveRichEditorToNote();
        }
      } catch {
        new Notice("切换前保存高级编辑失败，模式未切换。请先检查笔记权限或手动保存后再试。");
        return false;
      }
    }
    this.settings.toolbarMode = mode;
    await this.saveSettings();
    if (nativeTableSel && mode !== "rich") {
      const view = this.getActiveMarkdownView();
      if (view) {
        const span = nativeTableSel;
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            this.applyNativeEditorSelectionForYoriInnerRange(view, span.from, span.to);
          });
        });
      }
    }
    return true;
  }
}
