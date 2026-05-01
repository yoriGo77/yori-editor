/**
 * 侧栏 / OS / URI-list / JSON HTML 等 DataTransfer 载荷中解析库内 TFile 与外部 File，
 * 供源码模式与高级编辑 drop 共用。
 */
import type { App } from "obsidian";
import { normalizePath, parseLinktext, TFile } from "obsidian";
import { snapshotRichDataTransferSync } from "./data-transfer-snapshot";

export type VaultDropLinkResolver = (linkPath: string, sourcePath: string) => TFile | null;

/** Obsidian 从文件列表等发起的「库内拖拽」常不把路径写进 DataTransfer，而是挂在内部 dragManager（社区插件惯例读取此处）。
 * @see https://github.com/zsviczian/obsidian-excalidraw-plugin （DropManager 内对 app.dragManager.draggable 的用法）
 */
export function peekObsidianInternalDragTFile(app: App): TFile | null {
  try {
    const dm = (app as unknown as { dragManager?: { draggable?: unknown } }).dragManager?.draggable;
    if (!dm || typeof dm !== "object") return null;
    const d = dm as { type?: unknown; file?: unknown };
    const ty = typeof d.type === "string" ? d.type.toLowerCase() : "";
    if (ty !== "link" && ty !== "file") return null;
    const f = d.file;
    return f instanceof TFile ? f : null;
  } catch {
    return null;
  }
}

function getVaultRootFullPathNormalized(app: App): string | null {
  const adapter = app.vault.adapter as unknown as { getFullPath?: (p: string) => string };
  const gfp = adapter.getFullPath;
  if (typeof gfp !== "function") return null;
  try {
    return gfp("").replace(/\\/g, "/").replace(/\/$/, "");
  } catch {
    return null;
  }
}

function resolveDroppedOsFileToVaultFile(app: App, absPath: string): TFile | null {
  const root = getVaultRootFullPathNormalized(app);
  if (!root) return null;
  const normAbs = absPath.replace(/\\/g, "/");
  if (!normAbs.toLowerCase().startsWith(root.toLowerCase() + "/")) return null;
  const rel = normalizePath(normAbs.slice(root.length + 1));
  const af = app.vault.getAbstractFileByPath(rel);
  return af instanceof TFile ? af : null;
}

/** Electron：部分环境下 File 无 `.path`，需 webUtils.getPathForFile */
function electronGpuPathForFile(file: File): string | undefined {
  try {
    const req = (globalThis as unknown as { require?: (id: string) => { webUtils?: { getPathForFile?: (f: File) => string } } })
      .require;
    const gpu = req?.("electron")?.webUtils?.getPathForFile;
    if (typeof gpu !== "function") return undefined;
    const p = gpu(file);
    return typeof p === "string" && p.length > 0 ? p : undefined;
  } catch {
    return undefined;
  }
}

function resolveDroppedFileEntryToVaultFile(app: App, file: File): TFile | null {
  const anyF = file as File & { path?: string };
  if (anyF.path) return resolveDroppedOsFileToVaultFile(app, String(anyF.path).replace(/\\/g, "/"));
  const gpu = electronGpuPathForFile(file);
  if (gpu) return resolveDroppedOsFileToVaultFile(app, gpu.replace(/\\/g, "/"));
  return null;
}

function resolveFileUrlToVaultFile(app: App, urlStr: string): TFile | null {
  const req = (globalThis as unknown as { require?: (id: string) => { fileURLToPath: (s: string) => string } }).require;
  const ftp = req?.("url")?.fileURLToPath;
  if (typeof ftp !== "function") return null;
  try {
    const abs = ftp(urlStr.trim());
    return resolveDroppedOsFileToVaultFile(app, abs);
  } catch {
    return null;
  }
}

/** Obsidian / Electron 侧栏拖拽常见：obsidian://… 或查询串中的库内路径 */
function tryResolveObsidianDragUriToVaultFile(app: App, s: string): TFile | null {
  const t = s.trim();
  if (!t) return null;
  if (!/^obsidian:/i.test(t)) return null;
  try {
    const u = new URL(t);
    const pathQs =
      u.searchParams.get("path") ??
      u.searchParams.get("file") ??
      u.searchParams.get("filepath") ??
      u.searchParams.get("vaultPath");
    if (pathQs) {
      let decoded = decodeURIComponent(pathQs.replace(/\+/g, "%20")).trim().replace(/\\/g, "/");
      const byOs = resolveDroppedOsFileToVaultFile(app, decoded);
      if (byOs) return byOs;
      decoded = decoded.replace(/^\/+/, "");
      const af = app.vault.getAbstractFileByPath(normalizePath(decoded));
      if (af instanceof TFile) return af;
    }
    const slug = `${u.hostname}${u.pathname}`.replace(/^\/+/, "").replace(/\/+$/, "");
    if (slug && !/^open$/i.test(slug)) {
      const af = app.vault.getAbstractFileByPath(normalizePath(slug));
      if (af instanceof TFile) return af;
    }
  } catch {
    return null;
  }
  return null;
}

/** Electron / Obsidian 系：`app://host/相对路径` 指向库内文件 */
function tryResolveAppSchemeVaultPath(app: App, s: string): TFile | null {
  const t = s.trim();
  if (!/^app:/i.test(t)) return null;
  try {
    const u = new URL(t);
    let rel = `${u.pathname}${u.search}`.replace(/^\/+/, "");
    rel = decodeURIComponent(rel.replace(/\+/g, "%20")).replace(/\\/g, "/");
    if (!rel) return null;
    const norm = normalizePath(rel);
    const byRel = app.vault.getAbstractFileByPath(norm);
    if (byRel instanceof TFile) return byRel;
    return null;
  } catch {
    return null;
  }
}

/** 侧栏 / 剪贴板等拖入的纯文本：wikilink、库相对路径、可解析链接名 */
function tryResolvePayloadTextToVaultFile(
  app: App,
  text: string,
  sourcePath: string,
  resolveVaultLinkDest: VaultDropLinkResolver
): TFile | null {
  const t = text.trim();
  if (!t || /[<>]/.test(t) || t.includes("\n")) return null;
  const wiki = /^!?\[\[([^\]]+)\]\]$/.exec(t);
  if (wiki) {
    const inner = wiki[1].split("|")[0].trim();
    const { path: linkPath } = parseLinktext(inner);
    const dest = resolveVaultLinkDest(linkPath, sourcePath);
    return dest instanceof TFile ? dest : null;
  }
  const asPath = normalizePath(t.replace(/\\/g, "/"));
  const byPath = app.vault.getAbstractFileByPath(asPath);
  if (byPath instanceof TFile) return byPath;
  const dest = resolveVaultLinkDest(t, sourcePath);
  if (dest instanceof TFile) return dest;
  const tl = t.toLowerCase();
  if (!tl.endsWith(".md") && !tl.endsWith(".markdown")) {
    const guessMd = normalizePath(`${t.replace(/\\/g, "/")}.md`);
    const byGuess = app.vault.getAbstractFileByPath(guessMd);
    if (byGuess instanceof TFile) return byGuess;
    const d3 = resolveVaultLinkDest(guessMd, sourcePath);
    if (d3 instanceof TFile) return d3;
  }
  return null;
}

function walkJsonDragStringsForVaultFiles(
  app: App,
  data: unknown,
  sourcePath: string,
  addExtra: (f: TFile | null) => void,
  depth: number,
  resolveVaultLinkDest: VaultDropLinkResolver
): void {
  if (depth > 14) return;
  if (typeof data === "string") {
    const s = data.trim();
    if (s.length === 0 || s.length > 8192) return;
    addExtra(tryResolveObsidianDragUriToVaultFile(app, s));
    addExtra(tryResolveAppSchemeVaultPath(app, s));
    addExtra(tryResolvePayloadTextToVaultFile(app, s, sourcePath, resolveVaultLinkDest));
    return;
  }
  if (Array.isArray(data)) {
    for (const x of data)
      walkJsonDragStringsForVaultFiles(app, x, sourcePath, addExtra, depth + 1, resolveVaultLinkDest);
    return;
  }
  if (data && typeof data === "object") {
    for (const v of Object.values(data as Record<string, unknown>)) {
      walkJsonDragStringsForVaultFiles(app, v, sourcePath, addExtra, depth + 1, resolveVaultLinkDest);
    }
  }
}

/** 侧栏拖笔记常见：整条载荷为 JSON，路径散列在嵌套字段里 */
function tryParseJsonDragPayloadStrings(
  app: App,
  raw: string,
  sourcePath: string,
  addExtra: (f: TFile | null) => void,
  resolveVaultLinkDest: VaultDropLinkResolver
): void {
  const t = raw.trim();
  if (!t.startsWith("{") && !t.startsWith("[")) return;
  try {
    const data = JSON.parse(t) as unknown;
    walkJsonDragStringsForVaultFiles(app, data, sourcePath, addExtra, 0, resolveVaultLinkDest);
  } catch {
    /* ignore */
  }
}

function scanHtmlDragPayloadForVaultFiles(
  app: App,
  html: string,
  sourcePath: string,
  addExtra: (f: TFile | null) => void,
  resolveVaultLinkDest: VaultDropLinkResolver
): void {
  const re = /\b(?:href|src)\s*=\s*(["'])([^"']*)\1/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const href = (m[2] ?? "").trim();
    if (!href) continue;
    addExtra(tryResolveObsidianDragUriToVaultFile(app, href));
    addExtra(tryResolveAppSchemeVaultPath(app, href));
    addExtra(tryResolvePayloadTextToVaultFile(app, href, sourcePath, resolveVaultLinkDest));
  }
}

/** 将每种 MIME 载荷按行解析为库内文件（兼容分叉客户端自定义拖曳类型） */
function scanDragTransferPayloadsForVaultFiles(
  app: App,
  payloads: Record<string, string>,
  sourcePath: string,
  addExtra: (f: TFile | null) => void,
  resolveVaultLinkDest: VaultDropLinkResolver
): void {
  const tryLine = (piece: string): void => {
    const p = piece.trim();
    if (!p || p.startsWith("#")) return;
    const low = p.toLowerCase();
    if (low.startsWith("file:")) {
      addExtra(resolveFileUrlToVaultFile(app, p));
      return;
    }
    if (/^app:/i.test(p)) {
      addExtra(tryResolveAppSchemeVaultPath(app, p));
      return;
    }
    addExtra(tryResolveObsidianDragUriToVaultFile(app, p));
    addExtra(tryResolvePayloadTextToVaultFile(app, p, sourcePath, resolveVaultLinkDest));
  };

  const scanBlock = (raw: string, mime: string): void => {
    if (!raw) return;
    const ml = mime.toLowerCase();
    if (ml.includes("html")) {
      scanHtmlDragPayloadForVaultFiles(app, raw, sourcePath, addExtra, resolveVaultLinkDest);
    }
    tryParseJsonDragPayloadStrings(app, raw, sourcePath, addExtra, resolveVaultLinkDest);

    if (!raw.includes("\n")) {
      tryLine(raw);
      return;
    }
    for (const line of raw.split(/\r?\n/)) tryLine(line);
  };

  for (const mime of Object.keys(payloads)) {
    if (mime === "text/uri-list") continue;
    const raw = payloads[mime];
    if (!raw || typeof raw !== "string") continue;
    if (raw.length > 24576) continue;
    scanBlock(raw, mime);
  }
}

export function ingestVaultLinkPiecesFromSnapshot(
  app: App,
  snap: { files: File[]; payloads: Record<string, string> },
  sourcePath: string,
  resolveVaultLinkDest: VaultDropLinkResolver
): { uniqVaultFiles: TFile[]; externalFiles: File[] } | null {
  const { files, payloads } = snap;
  type Piece = { kind: "vault"; tf: TFile } | { kind: "ext"; file: File };
  const pieces: Piece[] = [];
  for (const file of files) {
    const tf = resolveDroppedFileEntryToVaultFile(app, file);
    if (tf) pieces.push({ kind: "vault", tf });
    else pieces.push({ kind: "ext", file });
  }

  const extraVault: TFile[] = [];
  const seenExtra = new Set<string>();
  const addExtra = (f: TFile | null): void => {
    if (!f || seenExtra.has(f.path)) return;
    seenExtra.add(f.path);
    extraVault.push(f);
  };

  addExtra(peekObsidianInternalDragTFile(app));

  for (const line of (payloads["text/uri-list"] ?? "").split(/\r?\n/)) {
    const u = line.trim();
    if (!u || u.startsWith("#")) continue;
    if (u.toLowerCase().startsWith("file:")) {
      addExtra(resolveFileUrlToVaultFile(app, u));
      continue;
    }
    addExtra(tryResolveObsidianDragUriToVaultFile(app, u));
  }
  scanDragTransferPayloadsForVaultFiles(app, payloads, sourcePath, addExtra, resolveVaultLinkDest);

  const pieceVaultPaths = new Set(
    pieces.filter((p): p is Piece & { kind: "vault" } => p.kind === "vault").map((p) => p.tf.path)
  );
  const extraFiltered = extraVault.filter((f) => !pieceVaultPaths.has(f.path));

  const vaultFromPieces = pieces
    .filter((p): p is Piece & { kind: "vault" } => p.kind === "vault")
    .map((p) => p.tf);
  const externalFiles = pieces.filter((p): p is Piece & { kind: "ext" } => p.kind === "ext").map((p) => p.file);

  const uniqVaultFiles: TFile[] = [];
  const sp = new Set<string>();
  for (const f of [...vaultFromPieces, ...extraFiltered]) {
    if (!sp.has(f.path)) {
      sp.add(f.path);
      uniqVaultFiles.push(f);
    }
  }

  if (uniqVaultFiles.length === 0 && externalFiles.length === 0) return null;
  return { uniqVaultFiles, externalFiles };
}

export function ingestDataTransferVaultLinkPieces(
  app: App,
  dt: DataTransfer,
  sourcePath: string,
  resolveVaultLinkDest: VaultDropLinkResolver
): { uniqVaultFiles: TFile[]; externalFiles: File[] } | null {
  return ingestVaultLinkPiecesFromSnapshot(app, snapshotRichDataTransferSync(dt), sourcePath, resolveVaultLinkDest);
}
