import { App, Plugin, PluginSettingTab, Setting, setIcon } from "obsidian";

import type { ToolbarMode, VaultLinkClickOpenMode, YoriEditorSettings } from "./yori-types";
import { settingsStrings, YORI_UI_LANG_OPTIONS, type YoriUiLang } from "./yori-locale";

/** 设置页所需的插件能力（避免从 ../main 导入而产生构建循环）。 */
export type YoriSettingsTabPlugin = Plugin & {
  settings: YoriEditorSettings;
  setToolbarMode(mode: ToolbarMode): Promise<boolean>;
  saveSettings(): Promise<void>;
  refreshToolbarForUiLanguage(): void;
};

export class YoriEditorSettingTab extends PluginSettingTab {
  plugin: YoriSettingsTabPlugin;

  constructor(app: App, plugin: YoriSettingsTabPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    const lang: YoriUiLang = this.plugin.settings.pluginUiLanguage === "en" ? "en" : "zh";
    const S = settingsStrings(lang);

    new Setting(containerEl).setName(S.title).setHeading();

    new Setting(containerEl)
      .setName(S.uiLanguage)
      .setDesc(S.uiLanguageDesc)
      .addDropdown((dropdown) => {
        for (const opt of YORI_UI_LANG_OPTIONS) {
          dropdown.addOption(opt.value, opt.label[lang]);
        }
        dropdown.setValue(this.plugin.settings.pluginUiLanguage).onChange(async (value: string) => {
          const v = value === "en" ? "en" : "zh";
          this.plugin.settings.pluginUiLanguage = v;
          await this.plugin.saveSettings();
          this.display();
        });
      });

    new Setting(containerEl)
      .setName(S.toolbarMode)
      .setDesc(`${S.toolbarModeLine1}\n\n${S.toolbarModeLine2}\n\n${S.toolbarModeLine3}`)
      .addDropdown((dropdown) =>
        dropdown
          .addOption("markdown-plus", S.modeNative)
          .addOption("rich", S.modeRich)
          .setValue(this.plugin.settings.toolbarMode)
          .onChange(async (value: ToolbarMode) => {
            const ok = await this.plugin.setToolbarMode(value);
            if (!ok) dropdown.setValue(this.plugin.settings.toolbarMode);
          })
      );
    new Setting(containerEl)
      .setName(S.vaultLinkOpen)
      .setDesc(S.vaultLinkOpenDesc)
      .addDropdown((dropdown) =>
        dropdown
          .addOption("smart", S.vaultSmart)
          .addOption("new-tab", S.vaultNewTab)
          .addOption("current-tab", S.vaultCurrentTab)
          .setValue(this.plugin.settings.vaultLinkClickOpenMode)
          .onChange(async (value: VaultLinkClickOpenMode) => {
            this.plugin.settings.vaultLinkClickOpenMode = value;
            await this.plugin.saveSettings();
          })
      );

    containerEl.createEl("hr", { cls: "yori-settings-hr" });

    const footer = containerEl.createDiv({ cls: "yori-settings-footer" });
    const tipsCol = footer.createDiv({ cls: "yori-settings-footer-tips" });
    tipsCol.createDiv({ cls: "yori-settings-footer-tips-heading", text: S.tipsHeading });
    tipsCol.createDiv({ cls: "yori-settings-footer-tip-text", text: S.tipDesktopOnly });
    tipsCol.createDiv({ cls: "yori-settings-footer-tip-text", text: S.tipRichDiskFormat });

    const donateHref = "https://yorigo77.github.io/";
    const donateLink = footer.createEl("a", {
      cls: "yori-settings-donate-card",
      href: donateHref
    });
    donateLink.setAttr("target", "_blank");
    donateLink.setAttr("rel", "noopener noreferrer");
    const iconWrap = donateLink.createDiv({ cls: "yori-settings-donate-icon" });
    setIcon(iconWrap, "heart");
    donateLink.createSpan({ cls: "yori-settings-donate-label", text: S.donate });
  }
}
