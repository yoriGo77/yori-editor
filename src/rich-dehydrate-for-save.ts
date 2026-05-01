/**
 * 高级编辑保存前：将 hydrate 产生的 DOM 还原为可存入 YORI 块的 Markdown/HTML，
 * 并整理字体 span、任务列表 class、非法 p+list 结构等。
 */
import { escapeMarkdownLinkTitle } from "./bare-url-markdown";
import {
  RICH_SAVE_SPAN_STYLE_KEYS,
  YORI_IMG_RESIZE_HOST_CLASS,
  YORI_RICH_ATOMIC_EMBED_CLASS,
  YORI_RICH_MEDIA_PARAGRAPH_CLASS,
  YORI_RICH_TASK_LI_BODY_CLASS,
  YORI_VIDEO_RESIZE_WRAP_CLASS,
  YORI_RICH_INLINE_TAG_CLASS
} from "./yori-constants";

function richBlockElement(el: Element): boolean {
  return /^(P|DIV|H[1-6]|UL|OL|LI|TABLE|TR|TD|TH|BLOCKQUOTE|PRE|HR|SECTION|ARTICLE|FIGURE)$/i.test(el.tagName);
}

function richInlineFontWrapperIsMeaningless(el: HTMLElement): boolean {
  if (el.tagName === "SPAN") {
    if (el.classList.length > 0) return false;
    for (const { name, value } of Array.from(el.attributes)) {
      const n = name.toLowerCase();
      if (n === "style") {
        if ((value || "").trim()) return false;
        continue;
      }
      return false;
    }
    return true;
  }
  if (el.tagName === "FONT") {
    if (el.classList.length > 0) return false;
    for (const { name, value } of Array.from(el.attributes)) {
      const n = name.toLowerCase();
      if (n === "style") {
        if ((value || "").trim()) return false;
        continue;
      }
      if (n === "color" || n === "face" || n === "size") {
        if ((value || "").trim()) return false;
        continue;
      }
      return false;
    }
    return true;
  }
  return false;
}

/** 去掉仅用于包字体的空壳 span/font（已无 style/class/face 等），避免多次改字体层层嵌套 */
export function unwrapRedundantRichFontSpansInHolder(holder: HTMLElement): void {
  let changed = true;
  while (changed) {
    changed = false;
    const nodes = Array.from(holder.querySelectorAll("span, font")) as HTMLElement[];
    for (const el of nodes) {
      if (!holder.contains(el)) continue;
      if (!richInlineFontWrapperIsMeaningless(el)) continue;
      const parent = el.parentNode;
      if (!parent) continue;
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
      changed = true;
      break;
    }
  }
}

/** 无 class、仅有 style（可无）的 span，允许做嵌套字体合并 */
function richSpanIsStyleOnlyNoClass(el: HTMLSpanElement): boolean {
  if (el.tagName !== "SPAN" || el.classList.length > 0) return false;
  for (const { name } of Array.from(el.attributes)) {
    if (name.toLowerCase() !== "style") return false;
  }
  return true;
}

/**
 * 父 span 仅有唯一子节点且子为 span 时：合并 style（内层覆盖同名属性），再拆掉内层，避免多次改字体叠套 span。
 */
function mergeRichNestedFontSpanPair(parent: HTMLSpanElement, inner: HTMLSpanElement): boolean {
  if (!richSpanIsStyleOnlyNoClass(parent) || !richSpanIsStyleOnlyNoClass(inner)) return false;
  if (parent.childNodes.length !== 1 || parent.firstChild !== inner) return false;

  const merged = new Map<string, { value: string; priority: string }>();
  const absorb = (st: CSSStyleDeclaration) => {
    for (let i = 0; i < st.length; i++) {
      const prop = st.item(i);
      merged.set(prop, { value: st.getPropertyValue(prop), priority: st.getPropertyPriority(prop) });
    }
  };
  absorb(parent.style);
  absorb(inner.style);

  while (inner.firstChild) parent.insertBefore(inner.firstChild, inner);
  parent.removeChild(inner);

  parent.removeAttribute("style");
  for (const [prop, { value, priority }] of merged) {
    const v = value.trim();
    if (!v) continue;
    parent.style.setProperty(prop, value, priority || undefined);
  }

  const st = parent.getAttribute("style");
  if (st) {
    const t = st.replace(/;\s*;/g, ";").replace(/^\s*;\s*|\s*;\s*$/g, "").trim();
    if (t) parent.setAttribute("style", t);
    else parent.removeAttribute("style");
  }
  if (richInlineFontWrapperIsMeaningless(parent)) {
    const p = parent.parentNode;
    if (p) {
      while (parent.firstChild) p.insertBefore(parent.firstChild, parent);
      p.removeChild(parent);
    }
  }
  return true;
}

function richDomElementDepthUnderRoot(el: Element, root: HTMLElement): number {
  let d = 0;
  let n: Element | null = el;
  while (n && n !== root) {
    d++;
    n = n.parentElement;
  }
  return d;
}

/** 合并相邻仅 style 的嵌套 span（由 extractContents / 多次裹 span 产生） */
function normalizeRichNestedFontSpansInTree(root: HTMLElement): void {
  let changed = true;
  while (changed) {
    changed = false;
    const spans = Array.from(root.querySelectorAll("span")) as HTMLSpanElement[];
    spans.sort((a, b) => richDomElementDepthUnderRoot(b, root) - richDomElementDepthUnderRoot(a, root));
    for (const inner of spans) {
      const parent = inner.parentElement;
      if (!parent || parent.tagName !== "SPAN") continue;
      if (mergeRichNestedFontSpanPair(parent as HTMLSpanElement, inner)) {
        changed = true;
        break;
      }
    }
  }
}

/** 去掉 extractContents 等产生的无子节点空 span */
function pruneRichEmptyInlineSpansInTree(root: HTMLElement): void {
  const candidates = Array.from(root.querySelectorAll("span")) as HTMLSpanElement[];
  for (const el of candidates) {
    if (!root.contains(el)) continue;
    if (el.childNodes.length === 0) el.remove();
  }
}

export function cleanupRichFontSpanSoupInTree(root: HTMLElement | null): void {
  if (!root) return;
  unwrapRedundantRichFontSpansInHolder(root);
  normalizeRichNestedFontSpansInTree(root);
  pruneRichEmptyInlineSpansInTree(root);
}

function richPlainParagraphToStorageLine(p: HTMLParagraphElement): string | null {
  for (const node of Array.from(p.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) continue;
    if (node.nodeType === Node.ELEMENT_NODE) {
      if ((node as Element).tagName === "BR") continue;
      return null;
    }
    return null;
  }
  let s = "";
  for (const node of Array.from(p.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) s += node.textContent ?? "";
    else if ((node as Element).tagName === "BR") s += "\n";
  }
  return s.replace(/\u200b/g, "");
}

/**
 * 整块选区设字体会落在 &lt;p style="font-family:..."&gt;；原生 Markdown 工具栏只解析 &lt;span style&gt;。
 * 脱水时把段上的行内字体相关样式包进单层 span，与 applyFontFamilyMarkdown 产物一致。
 */
function hoistRichParagraphFontStylesIntoInnerSpanForSave(root: HTMLElement): void {
  for (const node of Array.from(root.querySelectorAll("p"))) {
    const p = node as HTMLParagraphElement;
    if (!root.contains(p)) continue;
    if (p.classList.contains(YORI_RICH_MEDIA_PARAGRAPH_CLASS)) continue;
    if (p.closest("td, th")) continue;
    if (richPlainParagraphToStorageLine(p) === null) continue;

    const ff = p.style.fontFamily?.trim();
    const fs = p.style.fontSize?.trim();
    const color = p.style.color?.trim();
    const fw = p.style.fontWeight?.trim();
    const fst = p.style.fontStyle?.trim();
    const tdeco = (p.style.textDecorationLine || p.style.textDecoration || "").trim();
    if (!ff && !fs && !color && !fw && !fst && !tdeco) continue;

    const span = document.createElement("span");
    if (ff) span.style.fontFamily = ff;
    if (fs) span.style.fontSize = fs;
    if (color) span.style.color = color;
    if (fw) span.style.fontWeight = fw;
    if (fst) span.style.fontStyle = fst;
    if (tdeco) span.style.textDecoration = tdeco;

    if (ff) p.style.removeProperty("font-family");
    if (fs) p.style.removeProperty("font-size");
    if (color) p.style.removeProperty("color");
    if (fw) p.style.removeProperty("font-weight");
    if (fst) p.style.removeProperty("font-style");
    if (tdeco) {
      p.style.removeProperty("text-decoration");
      p.style.removeProperty("text-decoration-line");
    }

    while (p.firstChild) span.appendChild(p.firstChild);
    p.appendChild(span);

    const st = p.getAttribute("style");
    if (!st || !st.trim()) p.removeAttribute("style");
  }
}

function rebuildElementStyleWithWhitelist(el: HTMLElement, allowed: ReadonlySet<string>): void {
  const st = el.style;
  const parts: string[] = [];
  for (let i = 0; i < st.length; i++) {
    const key = st.item(i);
    if (!key) continue;
    const lk = key.toLowerCase();
    if (!allowed.has(lk)) continue;
    const val = st.getPropertyValue(key).trim();
    if (!val) continue;
    parts.push(`${lk}:${val}`);
  }
  if (parts.length) el.setAttribute("style", parts.join(";"));
  else el.removeAttribute("style");
}

/**
 * contenteditable 常把浏览器默认/UA 样式写进 span 的 style，原生源码里会变成超长标签。
 * 仅保留作者意图相关的声明（与工具栏一致）。
 */
function stripNonAuthorInlineStylesForSave(root: HTMLElement): void {
  for (const el of Array.from(root.querySelectorAll("span[style], font[style]"))) {
    if (el instanceof HTMLElement) rebuildElementStyleWithWhitelist(el, RICH_SAVE_SPAN_STYLE_KEYS);
  }
  const pKeys = new Set(["text-align", "line-height"]);
  for (const el of Array.from(root.querySelectorAll("p[style]"))) {
    if (!(el instanceof HTMLParagraphElement)) continue;
    if (el.classList.contains(YORI_RICH_MEDIA_PARAGRAPH_CLASS)) continue;
    rebuildElementStyleWithWhitelist(el, pKeys);
  }
  const markKeys = new Set(["background-color", "color"]);
  for (const el of Array.from(root.querySelectorAll("mark[style]"))) {
    if (el instanceof HTMLElement) rebuildElementStyleWithWhitelist(el, markKeys);
  }
}

function dehydrateRichPdfEmbedsForSave(root: HTMLElement): void {
  root.querySelectorAll(".yori-rich-pdf-embed[data-yori-pdf-embed]").forEach((el) => {
    const raw = el.getAttribute("data-yori-pdf-embed") ?? "";
    el.replaceWith(document.createTextNode(`![[${raw}]]`));
  });
}

/** 兼容旧版内联 video/audio DOM */
function dehydrateLegacyRichVideoAudioForSave(root: HTMLElement): void {
  root.querySelectorAll("video[data-yori-video-embed]").forEach((el) => {
    const raw = el.getAttribute("data-yori-video-embed") ?? "";
    const wrap = el.closest(`.${YORI_VIDEO_RESIZE_WRAP_CLASS}`);
    const repl = wrap && root.contains(wrap) ? wrap : el;
    repl.replaceWith(document.createTextNode(`![[${raw}]]`));
  });
  root.querySelectorAll("audio[data-yori-audio-embed]").forEach((el) => {
    const raw = el.getAttribute("data-yori-audio-embed") ?? "";
    el.replaceWith(document.createTextNode(`![[${raw}]]`));
  });
  root.querySelectorAll("[data-yori-file-embed]").forEach((el) => {
    const raw = el.getAttribute("data-yori-file-embed") ?? "";
    el.replaceWith(document.createTextNode(`![[${raw}]]`));
  });
}

/** 写入笔记前：把 hydrate 产生的图片还原为 ![[...]]（含 resize 包装层一并替换）。 */
function dehydrateRichImageEmbedsForSave(root: HTMLElement): void {
  const list = Array.from(root.querySelectorAll("img[data-yori-image-embed]"));
  for (const el of list) {
    const raw = el.getAttribute("data-yori-image-embed") ?? "";
    const host = el.closest(`.${YORI_IMG_RESIZE_HOST_CLASS}`);
    const repl = host != null && root.contains(host) ? host : el;
    repl.replaceWith(document.createTextNode(`![[${raw}]]`));
  }
}

/** 高级编辑内外链 &lt;a href="http…"&gt; 落盘为 Markdown，避免只剩纯文本尖括号。 */
function dehydrateRichExternalAnchorsForSave(root: HTMLElement): void {
  const list = Array.from(root.querySelectorAll("a[href]")).filter(
    (el): el is HTMLAnchorElement =>
      el instanceof HTMLAnchorElement &&
      !el.classList.contains("internal-link") &&
      /^https?:\/\//i.test((el.getAttribute("href") ?? "").trim())
  );
  for (const a of list) {
    const href = (a.getAttribute("href") ?? "").trim();
    const inner = (a.textContent ?? "").replace(/\s+/g, " ").trim();
    const md =
      inner === "" || inner === href ? `<${href}>` : `[${escapeMarkdownLinkTitle(inner)}](${href})`;
    a.replaceWith(document.createTextNode(md));
  }
}

/** 写入笔记前：高级编辑内 `#标签` span 还原为纯文本（保持与 Markdown 标签语法一致）。 */
function dehydrateRichInlineTagsForSave(root: HTMLElement): void {
  root.querySelectorAll(`span.${YORI_RICH_INLINE_TAG_CLASS}`).forEach((el) => {
    el.replaceWith(document.createTextNode(el.textContent ?? ""));
  });
}

/** 写入笔记前：将 hydrate 产生的内部链接还原为 `[[...]]`，保证反向链接与图谱仍可识别。 */
function dehydrateRichWikilinksForSave(root: HTMLElement): void {
  root.querySelectorAll("a.internal-link[data-yori-wikilink]").forEach((el) => {
    const raw = el.getAttribute("data-yori-wikilink") ?? "";
    el.replaceWith(document.createTextNode(`[[${raw}]]`));
  });
}

/** 富文本保存：hydrate 时套的块壳在脱水后展平，避免多余 div 残留在 Markdown 源里 */
function unwrapRichMediaParagraphShellsForSave(root: HTMLElement): void {
  root.querySelectorAll(`.${YORI_RICH_MEDIA_PARAGRAPH_CLASS}`).forEach((mp) => {
    const holder = mp.querySelector(`:scope > .${YORI_RICH_ATOMIC_EMBED_CLASS}`) as HTMLElement | null;
    if (!holder || holder.parentElement !== mp) return;
    const frag = document.createDocumentFragment();
    while (holder.firstChild) frag.appendChild(holder.firstChild);
    mp.replaceWith(frag);
  });
}

function findNextRichParagraphWithDirectList(root: HTMLElement): HTMLParagraphElement | null {
  for (const el of Array.from(root.querySelectorAll("p"))) {
    if (!(el instanceof HTMLParagraphElement)) continue;
    if (!root.contains(el)) continue;
    if (el.classList.contains(YORI_RICH_MEDIA_PARAGRAPH_CLASS)) continue;
    if (Array.from(el.children).some((c) => c.tagName === "UL" || c.tagName === "OL")) {
      return el;
    }
  }
  return null;
}

function richParagraphDiscardableAfterListUnwrap(p: HTMLParagraphElement): boolean {
  if (p.childNodes.length === 0) return true;
  const t = (p.textContent ?? "").replace(/\u200b/g, "").trim();
  if (t.length > 0) return false;
  if (p.querySelector("img, video, audio, table, input, hr")) return false;
  if (p.childNodes.length === 1 && p.firstChild?.nodeName === "BR") return false;
  if (p.querySelector("br")) return false;
  return true;
}

/** p 内不能直接放 ul/ol，否则浏览器会拆出孤立的 「</p>」 文本；contenteditable 仍常产生此类 DOM。 */
export function unwrapRichParagraphsWrappingDirectLists(root: HTMLElement): boolean {
  let changed = false;
  for (;;) {
    const p = findNextRichParagraphWithDirectList(root);
    if (!p) break;
    const parent = p.parentNode;
    if (!parent) break;
    const directLists = Array.from(p.children).filter((c) => c.tagName === "UL" || c.tagName === "OL");
    if (directLists.length === 0) break;
    for (let i = directLists.length - 1; i >= 0; i--) {
      parent.insertBefore(directLists[i], p);
    }
    changed = true;
    if (richParagraphDiscardableAfterListUnwrap(p)) {
      p.remove();
    }
  }
  return changed;
}

/**
 * 解析器/粘贴/contenteditable 可能留下仅含字面量 「</p>」 的文本节点，原生源码里会显示成脏标记。
 */
export function stripRichStrayParagraphCloseTagTextNodes(root: HTMLElement): boolean {
  const re = /^[\s\uFEFF\u00a0]*<\/p\s*>[\s\uFEFF\u00a0]*$/i;
  let changed = false;
  const walk = (n: Node) => {
    for (const c of Array.from(n.childNodes)) {
      if (c.nodeType === Node.TEXT_NODE) {
        if (re.test((c.textContent ?? "").replace(/\u200b/g, ""))) {
          c.remove();
          changed = true;
        }
      } else if (c.nodeType === Node.ELEMENT_NODE) {
        walk(c);
      }
    }
  };
  walk(root);
  return changed;
}

/** 落盘前拆掉 Grid 辅助 span，与原生/Live Preview HTML 结构一致 */
function unwrapRichTaskListLiBodiesForSave(root: HTMLElement): void {
  root.querySelectorAll(`li.task-list-item > span.${YORI_RICH_TASK_LI_BODY_CLASS}`).forEach((node) => {
    const span = node as HTMLSpanElement;
    const parent = span.parentNode;
    if (!(parent instanceof HTMLLIElement)) return;
    while (span.firstChild) parent.insertBefore(span.firstChild, span);
    span.remove();
  });
}

/**
 * 当前列表项对应的任务复选框：直接子级 input，或子块内一层（如 &lt;p&gt;&lt;input&gt;），
 * 不包含嵌套子 ul/ol 里的 checkbox。
 */
export function findTaskCheckboxOnDirectListItem(li: HTMLLIElement): HTMLInputElement | null {
  const direct = li.querySelector(":scope > input[type='checkbox']") as HTMLInputElement | null;
  if (direct) return direct;
  for (const kid of Array.from(li.children)) {
    if (kid.tagName === "UL" || kid.tagName === "OL") continue;
    const nested = kid.querySelector?.("input[type='checkbox']") ?? null;
    if (nested && kid.contains(nested)) return nested as HTMLInputElement;
  }
  return null;
}

/**
 * li 使用双列 Grid 时，若复选框后直接跟多个行内节点（文本、span），浏览器会为每个节点各占一行。
 * 将此类正文包进单个 span，使整句与圆框同一视觉行（保存前会 unwrap，不落盘）。
 */
function normalizeRichTaskListLiBodiesForGrid(root: HTMLElement): boolean {
  let changed = false;
  for (const li of Array.from(root.querySelectorAll("li.task-list-item"))) {
    if (!(li instanceof HTMLLIElement)) continue;
    if (!root.contains(li)) continue;
    if (li.querySelector(`:scope > .${YORI_RICH_TASK_LI_BODY_CLASS}`)) continue;

    const cb = li.querySelector(
      ":scope > input.task-list-item-checkbox, :scope > input[type='checkbox']"
    ) as HTMLInputElement | null;
    if (!cb || cb.type !== "checkbox") continue;

    const afterCb: Node[] = [];
    let past = false;
    for (const n of Array.from(li.childNodes)) {
      if (n === cb) {
        past = true;
        continue;
      }
      if (!past) continue;
      afterCb.push(n);
    }
    if (afterCb.length === 0) continue;

    const hasBlock = afterCb.some((n) => {
      if (n.nodeType !== Node.ELEMENT_NODE) return false;
      return richBlockElement(n as Element);
    });
    if (hasBlock) continue;

    const wrap = document.createElement("span");
    wrap.classList.add(YORI_RICH_TASK_LI_BODY_CLASS);
    for (const n of afterCb) wrap.appendChild(n);
    li.appendChild(wrap);
    changed = true;
  }
  return changed;
}

/**
 * 旧版或外源 HTML 常是 `<ul><li><input type="checkbox">` 无 class；原生/Live Preview 会按普通列表画圆点。
 * 与 Obsidian 任务列表对齐：`ul.contains-task-list`、`li.task-list-item`、`input.task-list-item-checkbox`。
 */
export function normalizeRichTaskListDom(root: HTMLElement | null, opts?: { skipLiBodyWrap?: boolean }): boolean {
  if (!root) return false;
  let changed = false;
  const uls = Array.from(root.querySelectorAll("ul"));
  for (const ul of uls) {
    if (!(ul instanceof HTMLUListElement)) continue;
    let any = false;
    for (const child of Array.from(ul.children)) {
      if (child.tagName !== "LI") continue;
      const li = child as HTMLLIElement;
      const inp = findTaskCheckboxOnDirectListItem(li);
      if (!inp) continue;
      any = true;
      if (!li.classList.contains("task-list-item")) changed = true;
      if (!inp.classList.contains("task-list-item-checkbox")) changed = true;
      li.classList.add("task-list-item");
      inp.classList.add("task-list-item-checkbox");
    }
    if (any && !ul.classList.contains("contains-task-list")) changed = true;
    if (any) ul.classList.add("contains-task-list");
  }
  if (!opts?.skipLiBodyWrap && normalizeRichTaskListLiBodiesForGrid(root)) changed = true;
  return changed;
}

/** contenteditable 内勾选只更新 IDL checked，序列化 innerHTML 时常不写出 checked 属性，
 * 落盘后原生/预览会显示未选中（标记列、任务列表等均受影响）。
 */
export function syncRichCheckboxCheckedAttributeForSave(root: HTMLElement): void {
  for (const inp of Array.from(root.querySelectorAll('input[type="checkbox"]'))) {
    if (!(inp instanceof HTMLInputElement)) continue;
    if (inp.checked) inp.setAttribute("checked", "");
    else inp.removeAttribute("checked");
  }
}

/** 富文本根 DOM 克隆保存前的完整脱水流水线（不含写盘）。 */
export function dehydrateRichEditorDomForSave(root: HTMLElement): void {
  cleanupRichFontSpanSoupInTree(root);
  hoistRichParagraphFontStylesIntoInnerSpanForSave(root);
  stripNonAuthorInlineStylesForSave(root);
  dehydrateRichPdfEmbedsForSave(root);
  dehydrateLegacyRichVideoAudioForSave(root);
  dehydrateRichImageEmbedsForSave(root);
  dehydrateRichExternalAnchorsForSave(root);
  dehydrateRichInlineTagsForSave(root);
  dehydrateRichWikilinksForSave(root);
  unwrapRichMediaParagraphShellsForSave(root);
  unwrapRichParagraphsWrappingDirectLists(root);
  stripRichStrayParagraphCloseTagTextNodes(root);
  unwrapRichTaskListLiBodiesForSave(root);
  normalizeRichTaskListDom(root, { skipLiBodyWrap: true });
  syncRichCheckboxCheckedAttributeForSave(root);
}
