import { Plugin, MarkdownView, WorkspaceLeaf } from 'obsidian';
import { DEFAULT_SETTINGS, YoriSettingTab, type YoriEditorSettings } from './settings';
import {
  mountToolbarForLeaf,
  unmountToolbarForLeaf,
  type YoriToolbar,
} from './editor/toolbar';
import { clearFormattingApprox } from './editor/nativeFormat';
import {
  getTableAtCursor,
  insertTableRow,
  deleteTableRow,
  insertTableColumn,
  deleteTableColumn,
  deleteTable,
} from './editor/tableMarkdown';
import { openExperimentalRichSelection, openExperimentalRichFullNote } from './experimental/richSelectionModal';

export default class YoriEditorPlugin extends Plugin {
  settings!: YoriEditorSettings;
  /** 每个 Markdown 编辑页签挂载一条工具栏 */
  toolbars = new WeakMap<WorkspaceLeaf, YoriToolbar>();

  async onload(): Promise<void> {
    await this.loadSettings();
    this.addSettingTab(new YoriSettingTab(this.app, this));

    this.addCommand({
      id: 'yori-experimental-rich-selection',
      name: '实验：富文本编辑当前选区（写回 HTML）',
      callback: () => openExperimentalRichSelection(this.app),
    });

    this.addCommand({
      id: 'yori-experimental-rich-full',
      name: '实验：富文本编辑全文（慎用 · 替换整篇）',
      callback: () => openExperimentalRichFullNote(this.app),
    });

    this.registerEvent(
      this.app.workspace.on('layout-change', () => {
        this.syncToolbars();
      }),
    );
    this.registerEvent(
      this.app.workspace.on('active-leaf-change', () => {
        this.syncToolbars();
      }),
    );

    this.registerEvent(
      this.app.workspace.on('editor-menu', (menu, editor) => {
        menu.addItem((item) =>
          item.setTitle('清除格式').onClick(() => {
            clearFormattingApprox(editor);
          }),
        );

        if (getTableAtCursor(editor)) {
          menu.addSeparator();
          menu.addItem((item) =>
            item.setTitle('在上方插入行').onClick(() => insertTableRow(editor, 'above')),
          );
          menu.addItem((item) =>
            item.setTitle('在下方插入行').onClick(() => insertTableRow(editor, 'below')),
          );
          menu.addItem((item) =>
            item.setTitle('删除当前行').onClick(() => deleteTableRow(editor)),
          );
          menu.addItem((item) =>
            item.setTitle('在左侧插入列').onClick(() => insertTableColumn(editor, 'left')),
          );
          menu.addItem((item) =>
            item.setTitle('在右侧插入列').onClick(() => insertTableColumn(editor, 'right')),
          );
          menu.addItem((item) =>
            item.setTitle('删除当前列').onClick(() => deleteTableColumn(editor)),
          );
          menu.addItem((item) =>
            item.setTitle('删除表格…').onClick(() => {
              if (confirm('确定删除整个表格？此操作不可撤销（除非使用编辑器的撤销）。'))
                deleteTable(editor);
            }),
          );
        }
      }),
    );

    this.syncToolbars();
  }

  onunload(): void {
    this.app.workspace.iterateAllLeaves((leaf) => {
      unmountToolbarForLeaf(this, leaf);
    });
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  /** 设置切换后强制重建工具栏 */
  refreshToolbars(): void {
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (leaf.view instanceof MarkdownView) {
        unmountToolbarForLeaf(this, leaf);
      }
    });
    this.syncToolbars();
  }

  private syncToolbars(): void {
    this.app.workspace.iterateAllLeaves((leaf: WorkspaceLeaf) => {
      if (!(leaf.view instanceof MarkdownView)) {
        unmountToolbarForLeaf(this, leaf);
        return;
      }
      const source = leaf.view.containerEl.querySelector('.markdown-source-view');
      if (!source) {
        unmountToolbarForLeaf(this, leaf);
        return;
      }
      if (!source.querySelector(':scope > .yori-toolbar-host')) {
        mountToolbarForLeaf(this, leaf);
      }
    });
  }
}
