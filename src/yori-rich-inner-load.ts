/**
 * 判断 YORI inner 是否应按「整块 HTML」直接塞进高级编辑根（而非按行走 markdownToInitialRichHtml）。
 */
export function yoriRichInnerLoadAsRawHtml(inner: string): boolean {
  const normalized = inner.replace(/\r\n/g, "\n");
  const t = normalized.trim();
  if (!t) return true;
  if (!/<[a-z][\w:-]*\b/i.test(t)) return false;

  if (!normalized.includes("\n")) return true;

  for (const line of normalized.split("\n")) {
    if (line.trim() === "") continue;
    if (!/^\s*</.test(line)) {
      if (
        /<\s*(?:table|thead|tbody|colgroup|tr|td|th)\b/i.test(normalized) ||
        /<\s*input\b/i.test(normalized)
      ) {
        return true;
      }
      return false;
    }
    break;
  }

  const probe = document.createElement("div");
  probe.innerHTML = normalized;
  const blockTags = new Set([
    "P",
    "UL",
    "OL",
    "TABLE",
    "DIV",
    "H1",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6",
    "BLOCKQUOTE",
    "PRE",
    "HR",
  ]);
  for (const child of Array.from(probe.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const tx = (child.textContent ?? "").replace(/\u200b/g, "");
      if (tx.replace(/\s/g, "").length > 0) return false;
    } else if (child.nodeType === Node.COMMENT_NODE) {
      continue;
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      if (!blockTags.has((child as Element).tagName)) return false;
    } else {
      return false;
    }
  }
  return true;
}
