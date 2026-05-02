/**
 * Electron 在渲染进程注入 `require`。obsidianmd/prefer-active-doc 禁止裸引用 `globalThis`，
 * 在桌面 Obsidian 中与 `globalThis` 等价的可用入口为 `window`。
 */
export function tryGetElectronRequire(): ((id: string) => unknown) | undefined {
  const w = window as Window & { require?: (id: string) => unknown };
  return typeof w.require === "function" ? w.require : undefined;
}
