/**
 * 高级编辑保存路径：根下若仅为简单纯文本段落，可落成「每段一行」字符串以缩小磁盘 HTML。
 */

export function richPlainParagraphToStorageLine(p: HTMLParagraphElement): string | null {
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
 * 高级编辑根下若只有无 class 的 &lt;p&gt;，且段内仅有文本与 &lt;br&gt;，则写入多行纯文本，避免原生模式看到满屏 &lt;p&gt; 标签。
 * 段级 style（整块字体字号等）或列表、表格、段内 span 等时返回 null，仍保存 innerHTML。
 */
export function trySerializeRichRootAsPlainLineText(root: HTMLElement): string | null {
  const kids = Array.from(root.children) as HTMLParagraphElement[];
  if (kids.length === 0) {
    const raw = (root.textContent ?? "").replace(/\u200b/g, "");
    return raw === "" ? "" : null;
  }
  const lines: string[] = [];
  for (const el of kids) {
    if (el.tagName !== "P") return null;
    if (el.classList.length > 0) return null;
    if ((el.getAttribute("style") || "").trim().length > 0) return null;
    const line = richPlainParagraphToStorageLine(el);
    if (line === null) return null;
    lines.push(line);
  }
  return lines.join("\n");
}

/** 脱水后的 clone：能简化则返回「每段一行」的纯文本，否则返回 innerHTML。 */
export function pickYoriInnerStorageFromDehydratedClone(clone: HTMLElement): string {
  const plain = trySerializeRichRootAsPlainLineText(clone);
  return plain !== null ? plain : clone.innerHTML;
}
