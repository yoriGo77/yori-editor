# 更新日志

## [0.5.2] - 2026-05-13

### 新增

- **格式刷 · 表格多格**：高级编辑下复制格式后，可拖选多个表格单元格，松开鼠标后将快照样式批量应用到每一格的全部内容（选区判定与批量文字色 / 高亮一致）。

### 修复与改进

- **格式刷**：取样紧贴文本节点与实时 DOM，避免落到外层块 / span 导致字体退回系统默认；合并祖先链上的下划线 / 删除线与 `<mark>` 高亮背景；行内样式统一用 `setProperty`；合并嵌套 span 时去掉会破坏带引号 `font-family` 的 `setAttribute("style")` 回写。
- **高亮持久化**：保存脱水时将 `<mark>` 转为带 `background-color` 的 `<span>`（适配 Obsidian `sanitizeHTMLToDom`）；span 样式白名单补充 `background-color`。
- **文案**：格式刷工具栏提示补充表格多格用法；移除「不支持多单元格格式刷」类过时提示。

## [0.5.1] - 2026-05-05

### 修复

- **阅读模式空白**：在「高级编辑」工具栏模式下打开任意 markdown 笔记并切换为阅读模式时，整张页面一片空白。原因是 Obsidian 1.4+ 的阅读模式可滚动外壳是 `.markdown-reading-view`，`.markdown-preview-view` 是其子节点；旧逻辑只把 preview-view 当作「阅读层」放行显示，外壳被 `display:none`，子节点跟着被隐藏。现把 reading-view 也判定为阅读层。
- **切到非 Markdown 视图后高级编辑残留**：`mountToolbar` 在活动叶子不是 Markdown 或拿不到 `.view-content` 时直接返回，未清理上一张笔记的 rich 编辑器外壳与 `display:none` 抑制。现统一调用 `unmountRichEditor()` 收尾。
- **工具栏面板的全局 click 监听泄漏**：5 处 `activeDocument.addEventListener("click", …, true)` 使用匿名函数且从不解绑，每次工具栏重建（叶子切换 / 布局变化）都多挂一层；插件卸载后仍残留至重启 Obsidian。改为统一注册/清理，`mountToolbar` 顶端清旧再加新，`onunload` 一并清理。
- **快速切笔记时勾选状态错位**：`scheduleRichEditorHydratePasses` 排队的 rAF / setTimeout 未跟踪也无法取消，闭包持有的 checkbox `snap` 可能被应用到下一篇笔记。新增 timer/raf 跟踪与取消，`run` 回调里校验当前编辑器与文件路径仍是调度时刻的那一份；`unmountRichEditor` 也会取消。
- **load / save 异步竞态**：快速切笔记或在异步加载完成前重挂时，可能把 A 笔记内容灌进 B 笔记的可编辑区，或把旧 inner 写到错文件。新增 `richEditorMountGeneration` 代次计数，`mountRichEditor` 自增；`loadRichEditorFromNote` / `saveRichEditorToNote` / `persistConsolidatedRichBodyToDisk` 在每个 `await` 后校验代次和编辑器实例，已失效则放弃。
- **块边界正则鲁棒性**：`splitNoteAroundRichBlock` 与 `getYoriRichInnerContentStartInBody` 的行分隔符由 `\r?\n` 扩展为 `(?:\r\n|\r|\n)`，兼容旧 Mac 风格 `\r-only` 换行的笔记。

## [0.5.0] - 2026-05-01

### 新增

- 表格右键菜单：将「新增行 / 新增列」改为四项——「在上方插入行」「在下方插入行」「在左侧插入列」「在右侧插入列」（中英文）。

### 修复

- **原生模式（阅读 / Live Preview）标记列表格**：多篇结构相同或预览中存在隐藏克隆 DOM 时，勾选某一格的复选框可能误写多张表，并触发 Obsidian「已被外部修改」类提示。现通过排除不可见表格克隆、为磁盘 HTML 中的 `<table>` 写入稳定的 `data-yori-sync-table-id`、对齐时优先使用该 id，并对短时间内的重复 `change/input` 去重，避免重复写盘。
