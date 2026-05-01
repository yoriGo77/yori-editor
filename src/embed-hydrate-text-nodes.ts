import { parseLinktext, TFile } from "obsidian";
import {
  ATTACHMENT_AUDIO_EXTENSIONS,
  ATTACHMENT_IMAGE_EXTENSIONS,
  ATTACHMENT_PDF_EXTENSIONS,
  ATTACHMENT_VIDEO_EXTENSIONS,
  YORI_RICH_INLINE_TAG_CLASS
} from "./yori-constants";

/** 文本节点内 `![[…]]` / 预览 `[[图]]` 水合所需回调（由插件通过 embedHydrateHost() 注入）。 */
export interface EmbedHydrateInTextNodeHost {
  parseNumericEmbedWidthSuffix(s: string): number | null;
  resolveVaultLinkDestForHydrate(linkPath: string, sourcePathHint?: string): TFile | null;
  vaultResourcePath(file: TFile): string;
  wrapRichMediaBlock(media: HTMLElement): HTMLElement;
  wrapRichImageWithResizeHost(img: HTMLImageElement): HTMLElement;
  createRichGenericFileEmbed(dest: TFile, rawInner: string): HTMLElement;
  schedulePdfEmbedSizing(box: HTMLElement, file: TFile): void;
}

/** 阅读视图 / 实时预览：块内 ![[图]] 与 纯 [[图]]（解析为图片文件）转为 &lt;img&gt; */
export function hydratePreviewImageEmbeds(root: HTMLElement, pathHint: string, host: EmbedHydrateInTextNodeHost): void {
  const baseReject = (node: Node): boolean => {
    const p = node.parentElement;
    if (!p || !root.contains(p)) return true;
    if (p.closest("a")) return true;
    if (p.closest("code, pre, script, style")) return true;
    return false;
  };
  const accept1 = (node: Node): number => {
    if (baseReject(node)) return NodeFilter.FILTER_REJECT;
    const v = node.nodeValue;
    return v && /!\[\[[^\]]+\]\]/.test(v) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
  };
  const accept2 = (node: Node): number => {
    if (baseReject(node)) return NodeFilter.FILTER_REJECT;
    const v = node.nodeValue;
    return v && /(?<!\!)\[\[[^\]]+\]\]/.test(v) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
  };
  const run = (accept: (n: Node) => number, fn: (t: Text) => void): void => {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: accept });
    const batch: Text[] = [];
    let n: Node | null;
    while ((n = w.nextNode())) batch.push(n as Text);
    for (const t of batch) fn(t);
  };
  run(accept1, (t) => replaceImageEmbedsInTextNode(t, pathHint, false, host));
  run(accept2, (t) => replacePlainWikiImageEmbedsInTextNodeForPreview(t, pathHint, host));
}

/** 仅阅读预览：[[x.png]] 且 x 解析为图片时转为 img，否则保留原文（不生成 &lt;a&gt;，避免与两侧渲染打架） */
function replacePlainWikiImageEmbedsInTextNodeForPreview(
  textNode: Text,
  sourcePath: string,
  host: EmbedHydrateInTextNodeHost
): void {
  const text = textNode.nodeValue ?? "";
  const re = /(?<!\!)\[\[([^\[\]]+)\]\]/g;
  if (!re.test(text)) return;
  re.lastIndex = 0;
  const frag = document.createDocumentFragment();
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      frag.appendChild(document.createTextNode(text.slice(last, m.index)));
    }
    const rawInner = m[1].trim();
    const pipeIdx = rawInner.indexOf("|");
    const pathPart = pipeIdx >= 0 ? rawInner.slice(0, pipeIdx).trim() : rawInner;
    const suffix = pipeIdx >= 0 ? rawInner.slice(pipeIdx + 1).trim() : "";
    if (!pathPart) {
      frag.appendChild(document.createTextNode(m[0]));
      last = m.index + m[0].length;
      continue;
    }
    const widthPx = host.parseNumericEmbedWidthSuffix(suffix);
    const { path: linkPath } = parseLinktext(pathPart);
    const dest = host.resolveVaultLinkDestForHydrate(linkPath, sourcePath);
    const ext = dest instanceof TFile ? dest.extension.toLowerCase() : "";
    if (dest instanceof TFile && ATTACHMENT_IMAGE_EXTENSIONS.has(ext)) {
      const img = document.createElement("img");
      img.src = host.vaultResourcePath(dest);
      img.alt = dest.basename;
      if (widthPx != null) {
        img.style.maxWidth = `${widthPx}px`;
        img.style.width = "100%";
      } else {
        img.style.maxWidth = "100%";
        img.style.width = "";
      }
      img.style.height = "auto";
      img.style.display = "block";
      frag.appendChild(img);
    } else {
      frag.appendChild(document.createTextNode(m[0]));
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    frag.appendChild(document.createTextNode(text.slice(last)));
  }
  textNode.parentNode?.replaceChild(frag, textNode);
}

export function replaceImageEmbedsInTextNode(
  textNode: Text,
  sourcePath: string,
  setDehydrateMarker: boolean,
  host: EmbedHydrateInTextNodeHost
): void {
  const text = textNode.nodeValue ?? "";
  const re = /!\[\[([^\[\]]+)\]\]/g;
  if (!re.test(text)) return;
  re.lastIndex = 0;
  const frag = document.createDocumentFragment();
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      frag.appendChild(document.createTextNode(text.slice(last, m.index)));
    }
    const rawInner = m[1].trim();
    const pipeIdx = rawInner.indexOf("|");
    const pathPart = pipeIdx >= 0 ? rawInner.slice(0, pipeIdx).trim() : rawInner;
    const suffix = pipeIdx >= 0 ? rawInner.slice(pipeIdx + 1).trim() : "";
    if (!pathPart) {
      frag.appendChild(document.createTextNode(m[0]));
      last = m.index + m[0].length;
      continue;
    }
    const widthPx = host.parseNumericEmbedWidthSuffix(suffix);
    const { path: linkPath } = parseLinktext(pathPart);
    const dest = host.resolveVaultLinkDestForHydrate(linkPath, sourcePath);
    const ext = dest instanceof TFile ? dest.extension.toLowerCase() : "";
    if (dest instanceof TFile && ATTACHMENT_IMAGE_EXTENSIONS.has(ext)) {
      const img = document.createElement("img");
      if (setDehydrateMarker) {
        img.setAttribute("data-yori-image-embed", rawInner);
      }
      img.src = host.vaultResourcePath(dest);
      img.alt = dest.basename;
      if (widthPx != null) {
        img.style.maxWidth = `${widthPx}px`;
        img.style.width = "100%";
      } else {
        img.style.maxWidth = "100%";
        img.style.width = "";
      }
      img.style.height = "auto";
      img.style.display = "block";
      frag.appendChild(host.wrapRichMediaBlock(host.wrapRichImageWithResizeHost(img)));
    } else if (dest instanceof TFile && ATTACHMENT_VIDEO_EXTENSIONS.has(ext)) {
      const video = document.createElement("video");
      if (setDehydrateMarker) {
        video.setAttribute("data-yori-video-embed", rawInner);
      }
      video.src = host.vaultResourcePath(dest);
      video.controls = true;
      video.preload = "metadata";
      video.style.maxWidth = "100%";
      video.style.width = "100%";
      video.style.height = "auto";
      video.style.display = "block";
      frag.appendChild(host.wrapRichMediaBlock(video));
    } else if (dest instanceof TFile && ATTACHMENT_AUDIO_EXTENSIONS.has(ext)) {
      const audio = document.createElement("audio");
      if (setDehydrateMarker) {
        audio.setAttribute("data-yori-audio-embed", rawInner);
      }
      audio.src = host.vaultResourcePath(dest);
      audio.controls = true;
      audio.preload = "metadata";
      audio.style.width = "100%";
      audio.style.display = "block";
      frag.appendChild(host.wrapRichMediaBlock(audio));
    } else if (dest instanceof TFile && ATTACHMENT_PDF_EXTENSIONS.has(ext)) {
      const box = document.createElement("div");
      box.className = "yori-rich-pdf-embed";
      if (setDehydrateMarker) {
        box.setAttribute("data-yori-pdf-embed", rawInner);
      }
      const iframe = document.createElement("iframe");
      iframe.src = host.vaultResourcePath(dest);
      iframe.title = dest.basename;
      iframe.setAttribute("loading", "lazy");
      iframe.setAttribute("class", "yori-rich-pdf-iframe");
      box.appendChild(iframe);
      frag.appendChild(host.wrapRichMediaBlock(box));
      host.schedulePdfEmbedSizing(box, dest);
    } else if (dest instanceof TFile) {
      /* 所有未单独分支的 ![[附件]]（含未来新格式）统一用媒体块包裹，保证后缘可落光标、Backspace 可整块删除 */
      const gen = host.createRichGenericFileEmbed(dest, rawInner);
      frag.appendChild(host.wrapRichMediaBlock(gen));
    } else {
      frag.appendChild(document.createTextNode(m[0]));
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    frag.appendChild(document.createTextNode(text.slice(last)));
  }
  textNode.parentNode?.replaceChild(frag, textNode);
}

/** 高级编辑：`[[wikilink]]` 水合为内链或可缩放图片块（与 ![[…]] 共用宿主回调）。 */
export function replaceWikilinksInTextNodeForHydrate(
  textNode: Text,
  sourcePath: string,
  host: EmbedHydrateInTextNodeHost
): void {
  const text = textNode.nodeValue ?? "";
  const re = /(?<!\!)\[\[([^\[\]]+)\]\]/g;
  if (!re.test(text)) return;
  re.lastIndex = 0;
  const frag = document.createDocumentFragment();
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      frag.appendChild(document.createTextNode(text.slice(last, m.index)));
    }
    const rawInner = m[1].trim();
    const pipeIdx = rawInner.indexOf("|");
    const pathPart = pipeIdx >= 0 ? rawInner.slice(0, pipeIdx).trim() : rawInner;
    const alias = pipeIdx >= 0 ? rawInner.slice(pipeIdx + 1).trim() : "";
    if (!pathPart) {
      frag.appendChild(document.createTextNode(m[0]));
      last = m.index + m[0].length;
      continue;
    }
    const { path: linkPath } = parseLinktext(pathPart);
    const dest = host.resolveVaultLinkDestForHydrate(linkPath, sourcePath);
    const destExt = dest instanceof TFile ? dest.extension.toLowerCase() : "";
    const widthPx = host.parseNumericEmbedWidthSuffix(alias);
    if (dest instanceof TFile && ATTACHMENT_IMAGE_EXTENSIONS.has(destExt)) {
      const img = document.createElement("img");
      img.setAttribute("data-yori-image-embed", rawInner);
      img.src = host.vaultResourcePath(dest);
      img.alt = dest.basename;
      if (widthPx != null) {
        img.style.maxWidth = `${widthPx}px`;
        img.style.width = "100%";
      } else {
        img.style.maxWidth = "100%";
        img.style.width = "";
      }
      img.style.height = "auto";
      img.style.display = "block";
      frag.appendChild(host.wrapRichMediaBlock(host.wrapRichImageWithResizeHost(img)));
      last = m.index + m[0].length;
      continue;
    }
    const linkAlias = alias.length > 0 && host.parseNumericEmbedWidthSuffix(alias) == null ? alias : "";
    const display =
      linkAlias ||
      (dest
        ? dest.basename.replace(/\.md$/i, "")
        : pathPart.split("/").pop()?.replace(/\.md$/i, "") ?? pathPart);
    const a = document.createElement("a");
    a.className = "internal-link";
    a.setAttribute("data-yori-wikilink", rawInner);
    a.setAttribute("data-href", pathPart);
    a.textContent = display;
    if (dest) {
      a.setAttribute("href", dest.path);
    } else {
      a.classList.add("is-unresolved");
    }
    frag.appendChild(a);
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    frag.appendChild(document.createTextNode(text.slice(last)));
  }
  textNode.parentNode?.replaceChild(frag, textNode);
}

function isValidRichInlineTagBody(body: string): boolean {
  if (!body || body.length > 512) return false;
  if (/^\p{N}+$/u.test(body)) return false;
  return true;
}

/** 单文本节点内将 `#标签` 替换为带 class 的 span（无效形似标签保留原文）。 */
export function replaceRichInlineTagsInTextNode(textNode: Text): void {
  const text = textNode.nodeValue ?? "";
  const re = /#([\p{L}\p{N}_][\p{L}\p{N}_/-]*)/gu;
  const matches: RegExpExecArray[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) matches.push(m);
  if (matches.length === 0) return;

  const frag = document.createDocumentFragment();
  let last = 0;
  for (const ma of matches) {
    const idx = ma.index;
    const full = ma[0];
    const body = ma[1] ?? "";
    if (idx > last) frag.appendChild(document.createTextNode(text.slice(last, idx)));
    if (!isValidRichInlineTagBody(body)) {
      frag.appendChild(document.createTextNode(full));
    } else {
      const span = document.createElement("span");
      span.className = YORI_RICH_INLINE_TAG_CLASS;
      span.setAttribute("data-yori-tag-body", body);
      span.textContent = full;
      frag.appendChild(span);
    }
    last = idx + full.length;
  }
  if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
  textNode.parentNode?.replaceChild(frag, textNode);
}

/** 高级编辑根节点：水合正文内的 `#标签`（须在 [[wikilink]] / ![[…]] 处理之后调用）。 */
export function hydrateRichInlineTagsInRichEditor(root: HTMLElement): void {
  const acceptNode = (node: Node): number => {
    const p = node.parentElement;
    if (!p || !root.contains(p)) return NodeFilter.FILTER_REJECT;
    if (p.closest(`span.${YORI_RICH_INLINE_TAG_CLASS}, code, pre, a, script, style`))
      return NodeFilter.FILTER_REJECT;
    const v = node.nodeValue;
    return v && /#[^\s#]/.test(v) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
  };
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode });
  const batch: Text[] = [];
  let nn: Node | null;
  while ((nn = w.nextNode())) batch.push(nn as Text);
  for (const t of batch) replaceRichInlineTagsInTextNode(t);
}
