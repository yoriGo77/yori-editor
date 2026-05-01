import type { App, TFile } from "obsidian";

/** 与插件 richHost / active 同步顺序一致的候选源路径（用于 metadataCache.getFirstLinkpathDest）。 */
export interface HydrateVaultLinkSourceCtx {
  richHostFile?: string | null;
  richHostViewFile?: string | null;
  richHostFilePathStored?: string | null;
  activeFile?: string | null;
}

export function buildOrderedHydrateVaultSourcePaths(
  sourcePathHint: string | undefined,
  ctx: HydrateVaultLinkSourceCtx
): string[] {
  const ordered: string[] = [];
  const push = (s: string | null | undefined): void => {
    if (s && !ordered.includes(s)) ordered.push(s);
  };
  push(sourcePathHint);
  push(ctx.richHostFile ?? undefined);
  push(ctx.richHostViewFile ?? undefined);
  push(ctx.richHostFilePathStored ?? undefined);
  push(ctx.activeFile ?? undefined);
  return ordered;
}

/** 从多个可能的源笔记路径尝试解析链目标（host / active 任一未及时同步时仍尽量解析）。 */
export function resolveVaultLinkDestFromHydrateSources(
  app: App,
  linkPath: string,
  orderedSourcePaths: string[]
): TFile | null {
  const mc = app.metadataCache;
  for (const s of orderedSourcePaths) {
    const d = mc.getFirstLinkpathDest(linkPath, s);
    if (d) return d;
  }
  return mc.getFirstLinkpathDest(linkPath, "");
}
