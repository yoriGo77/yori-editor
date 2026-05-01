/** 用于拼接正则的字面量转义 */
export function escapeForRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function splitLeadingYamlFrontmatter(text: string): { frontmatter: string; body: string } {
  if (!text.startsWith("---\n")) return { frontmatter: "", body: text };
  const close = text.indexOf("\n---", 4);
  if (close < 0) return { frontmatter: "", body: text };
  let bodyStart = close + 4;
  if (bodyStart < text.length && text[bodyStart] === "\r") bodyStart++;
  if (bodyStart < text.length && text[bodyStart] === "\n") {
    bodyStart++;
  } else if (bodyStart >= text.length) {
    return { frontmatter: text, body: "" };
  } else {
    return { frontmatter: "", body: text };
  }
  return { frontmatter: text.slice(0, bodyStart), body: text.slice(bodyStart) };
}

/** 正文内 YORI 块与块外 Markdown 分段（不含 frontmatter；frontmatter 须先剥掉） */
export function splitNoteAroundRichBlock(
  richBlockStart: string,
  richBlockEnd: string,
  text: string
): { prefix: string; inner: string | null; suffix: string } {
  const escapedStart = escapeForRegex(richBlockStart);
  const escapedEnd = escapeForRegex(richBlockEnd);
  const re = new RegExp(`${escapedStart}\\r?\\n([\\s\\S]*?)\\r?\\n${escapedEnd}`);
  const m = re.exec(text);
  if (!m) return { prefix: text, inner: null, suffix: "" };
  const idx = m.index ?? 0;
  return { prefix: text.slice(0, idx), inner: m[1] ?? "", suffix: text.slice(idx + m[0].length) };
}

export function composeNoteWithFrontmatterAndRichBlock(
  richBlockStart: string,
  richBlockEnd: string,
  frontmatter: string,
  innerHtml: string
): string {
  const block = `${richBlockStart}\n${innerHtml}\n${richBlockEnd}\n`;
  if (!frontmatter) return block;
  const gap = frontmatter.endsWith("\n") ? "" : "\n";
  return `${frontmatter}${gap}${block}`;
}

/** YORI 块内富 HTML 正文在 body 中的起始下标（不含块界注释行本身）。 */
export function getYoriRichInnerContentStartInBody(
  richBlockStart: string,
  richBlockEnd: string,
  body: string
): number | null {
  const escapedStart = escapeForRegex(richBlockStart);
  const escapedEnd = escapeForRegex(richBlockEnd);
  const re = new RegExp(`${escapedStart}\\r?\\n([\\s\\S]*?)\\r?\\n${escapedEnd}`);
  const m = re.exec(body);
  if (!m || m.index === undefined) return null;
  let cursor = m.index + richBlockStart.length;
  if (body[cursor] === "\r") cursor++;
  if (body[cursor] === "\n") cursor++;
  return cursor;
}
