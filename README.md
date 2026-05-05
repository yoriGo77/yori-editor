# Yori Editor

**作者：** YoriGo
功能更丰富的笔记编辑工具，支持自定义表格、字体颜色、对齐、字体高亮、段落边框等设置.


## 功能
- 设置字体，字体大小，字体颜色，字体高亮颜色
- 设置文本对齐方式
- 更为强大的表格功能，设置单元格背景颜色，表格边框颜色，合并拆分单元格
- 更多表格功能方便使用，将列改为自动编号列，复选框标记列；表格右键可在上方/下方插入行，在左侧/右侧插入列
- 基础项目符号、编号、任务列表功能
- 为文本插入分隔线，为段落加上边框功能
- 添加附件，或拖拽文件来添加
- 添加笔记或库文件链接，或拖拽来添加
- 添加笔记标签
- 保留了原来的基础markdown编辑模式（通过设置-切换），并提升了字体，字体颜色，字体高亮等功能


## 安装

> **本插件仅通过 GitHub Release 手动安装**，不在 Obsidian 官方「社区插件」商店上架。原因详见下方[「关于不上架社区插件商店」](#关于不上架社区插件商店)一节。

### 手动安装
1. 前往本仓库 [Releases 页面](https://github.com/yoriGo77/yori-editor/releases) 下载最新版的 `main.js`、`manifest.json`、`styles.css` 三个文件
2. 在你的 Obsidian 库目录下找到 `.obsidian/plugins/`
3. 在该目录下新建文件夹 `yori-editor`
4. 把上面三个文件放入 `yori-editor/` 文件夹
5. 重启 Obsidian，进入 **设置 → 第三方插件 → 已安装插件**，启用 **Yori Editor**

> 后续升级时，重复上述下载步骤覆盖三个文件即可；个人配置和数据不会丢失。


## 关于不上架社区插件商店

本插件实现了一个独立的富文本（contenteditable）编辑视图，依赖若干浏览器原生 API（如 `execCommand`、`queryCommandValue`、`caretRangeFromPoint`），它们目前在 Obsidian 商店审核规范中被归类为 deprecated；同时插件内部为了支撑表格、字体样式等富文本能力，存在较多直接的 DOM 与 inline style 操作，与 Obsidian 推荐的 Editor API（基于 CodeMirror 6）的设计哲学方向不一致。

综合考虑维护成本、审核规范契合度，**作者主动选择不在 Obsidian 社区插件商店上架本插件**，仅通过 GitHub Release 手动安装方式提供，给愿意自行手动安装的用户使用。

如果你需要一款严格遵循 Obsidian 商店审核规范、且能从内置「社区插件」中直接搜索安装的笔记/任务/仪表盘工具，请使用作者另外两款已上架（或待上架）的插件：

- **Yori Task**：任务盒子 / 周计划 / 年计划。仓库：[obsidian-yori-task](https://github.com/yoriGo77/obsidian-yori-task)
- **Yori Dashboard**：每日事件 / 数据记录 / 任务盒子 / 打卡 / 每日时刻 / 每月计划 / 快捷入口的整合仪表盘。仓库：[obsidian-yori-dashboard](https://github.com/yoriGo77/obsidian-yori-dashboard)


## 兼容性
- 最低 Obsidian 版本：以 `manifest.json` 的 `minAppVersion` 为准  
- 桌面端 / 移动端：暂只支持桌面端，以 `manifest.json` 的 `isDesktopOnly` 为准



## 许可证
MIT — 见仓库根目录 `LICENSE`。
