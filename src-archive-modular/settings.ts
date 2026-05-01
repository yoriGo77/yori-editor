import { PluginSettingTab, Setting, App } from 'obsidian';
import type YoriEditorPlugin from './main';

/**
 * 方案 A：笔记载体始终是 `.md`，卸载插件后用户仍可完全回归 Obsidian 自带 Markdown。
 * - native：源码模式下的工具栏增强（当前已实现）。
 * - advanced：未来将接入「同一文件」上的富文本编辑表面（参考 editor 副本6），不写独立扩展名。
 *
 * 借鉴说明：`editor副本6` 可作交互与「写回 MarkdownView」思路参考，避免大块迁移其源码，
 * 以免带入历史上难以定位的缺陷；新功能宜分模块重写并单独回归测试。
 */
export type EditMode = 'native' | 'advanced';

export interface YoriEditorSettings {
  editMode: EditMode;
  defaultFontSizeLabel: string;
  defaultFontFamily: string;
  /** 段落边框上次使用的颜色（色盘） */
  lastParagraphBorderColor: string;
}

export const DEFAULT_SETTINGS: YoriEditorSettings = {
  editMode: 'native',
  defaultFontSizeLabel: '正文',
  defaultFontFamily: 'inherit',
  lastParagraphBorderColor: '#99876c',
};

export class YoriSettingTab extends PluginSettingTab {
  plugin: YoriEditorPlugin;

  constructor(app: App, plugin: YoriEditorPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'Yori Editor' });

    new Setting(containerEl)
      .setName('编辑体验')
      .setDesc(
        '采用方案 A：正文保存在标准 Markdown 文件中；样式尽量使用 Obsidian 能识别的 Markdown / HTML。卸载插件后，笔记仍在库里，可用原生编辑器继续查看与修改（源码中可能出现 HTML 等，属正常现象）。「富文本」选项将在同一 .md 上叠加所见即所得表面，近期迭代接入。',
      )
      .addDropdown((dropdown) =>
        dropdown
          .addOption('native', 'Markdown 增强（工具栏 + 源码编辑）')
          .addOption(
            'advanced',
            '富文本优先（同一 .md，开发中；当前与增强模式行为一致）',
          )
          .setValue(this.plugin.settings.editMode)
          .onChange(async (value) => {
            this.plugin.settings.editMode = value as EditMode;
            await this.plugin.saveSettings();
            this.plugin.refreshToolbars();
          }),
      );

    new Setting(containerEl)
      .setName('实验功能')
      .setDesc(
        '命令面板：「实验：富文本编辑当前选区」——源码下选中片段后排版写回 HTML。「实验：富文本编辑全文」——替换整篇慎用（易破坏 Markdown）。\n\n尚未在纯源码管线实现的项（需 ProseMirror 级整页编辑器）：表格拖线调宽、多选单元格批量格式、单元格内 Ctrl+A、编号列/标记列与右键色盘的完整表格交互等；当前 HTML 表与 Markdown 表为插入模板级能力。',
      );
  }
}
