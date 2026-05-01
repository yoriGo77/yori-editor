/** 纯 http(s) URL 粘贴转 Markdown 外链（源码模式 CM paste / 富文本菜单粘贴等共用）。 */

export function isBareHttpUrlPaste(text: string): boolean {
  const t = text.trim();
  if (!t || t.includes("\n") || t.includes("\r")) return false;
  return /^https?:\/\/[^\s<>"']+$/i.test(t);
}

/** Markdown 链接标题中需转义的字符（尽量保持与常见 Markdown 方言兼容）。 */
export function escapeMarkdownLinkTitle(title: string): string {
  return title.replace(/\\/g, "\\\\").replace(/\[/g, "\\[").replace(/\]/g, "\\]");
}

export function displayLabelForExternalUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^www\./i, "");
    const path = u.pathname === "/" ? "" : u.pathname;
    return `${host}${path}${u.search || ""}`;
  } catch {
    return url.trim();
  }
}

/** 源码 / 实时预览：用显式 Markdown 链接，比尖括号自动链接更易被渲染成可点外链。 */
export function markdownInlineLinkFromBareUrl(url: string): string {
  const u = url.trim();
  return `[${escapeMarkdownLinkTitle(displayLabelForExternalUrl(u))}](${u})`;
}
