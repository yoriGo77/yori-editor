import type { App } from "obsidian";

export function executeObsidianCommandById(app: App, id: string): boolean {
  const a = app as unknown as { commands?: { executeCommandById: (x: string) => boolean } };
  return a.commands?.executeCommandById(id) ?? false;
}

export function getObsidianInternalCommandMap(app: App): Record<string, { name?: string }> | null {
  const a = app as unknown as {
    commands?: { commands: Record<string, { name?: string }> };
  };
  const m = a.commands?.commands;
  return m && typeof m === "object" ? m : null;
}

export function tryExecuteCommandIds(app: App, ids: readonly string[]): boolean {
  for (const id of ids) {
    if (executeObsidianCommandById(app, id)) return true;
  }
  return false;
}

/** 命令 id 同时包含全部片段（忽略大小写）时依次尝试执行；优先 `editor:`。 */
export function tryExecuteCommandByIdFragments(app: App, fragments: readonly string[]): boolean {
  const map = getObsidianInternalCommandMap(app);
  if (!map || fragments.length === 0) return false;
  const fr = fragments.map((f) => f.toLowerCase());
  const candidates = Object.keys(map)
    .filter((id) => {
      const lid = id.toLowerCase();
      return fr.every((f) => lid.includes(f));
    })
    .sort((a, b) => {
      const pri = (x: string) => (x.startsWith("editor:") ? 0 : x.startsWith("markdown:") ? 1 : 2);
      const d = pri(a) - pri(b);
      if (d !== 0) return d;
      return a.length - b.length;
    });
  return tryExecuteCommandIds(app, candidates);
}

/** 命令显示名（可能本地化）中同时包含全部子串时依次尝试执行。 */
export function tryExecuteCommandByNameFragments(app: App, fragments: readonly string[]): boolean {
  const map = getObsidianInternalCommandMap(app);
  if (!map || fragments.length === 0) return false;
  const fr = fragments.map((f) => f.toLowerCase());
  const candidates = Object.entries(map)
    .filter(([, cmd]) => {
      const name = (cmd?.name ?? "").toLowerCase();
      return fr.every((f) => name.includes(f));
    })
    .map(([id]) => id)
    .sort((a, b) => {
      const ap = a.startsWith("editor:") ? 0 : 2;
      const bp = b.startsWith("editor:") ? 0 : 2;
      if (ap !== bp) return ap - bp;
      return a.localeCompare(b);
    });
  return tryExecuteCommandIds(app, candidates);
}

/**
 * 与 runNativeOnly 相同解析顺序，但不弹 Notice；用于「先试原生命令，失败再手写编辑」。
 */
export function tryRunNativeOnlyQuiet(
  app: App,
  nativeIds: string[],
  extra?: { idFragments?: string[][]; nameFragments?: string[][] }
): boolean {
  if (tryExecuteCommandIds(app, nativeIds)) return true;
  if (extra?.idFragments) {
    for (const g of extra.idFragments) {
      if (tryExecuteCommandByIdFragments(app, g)) return true;
    }
  }
  if (extra?.nameFragments) {
    for (const g of extra.nameFragments) {
      if (tryExecuteCommandByNameFragments(app, g)) return true;
    }
  }
  return false;
}
