import { displayLabelForExternalUrl } from "./bare-url-markdown";

/** 富文本 / Markdown 中共用的 HTML 文本转义（不含属性专用规则）。 */
export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function escapeRichHtmlAttr(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

/** 高级编辑插入外链：与原生 Markdown 外链展示文案一致。 */
export function richExternalLinkHtmlFromUrl(url: string): string {
  const u = url.trim();
  const label = escapeHtml(displayLabelForExternalUrl(u));
  const href = escapeRichHtmlAttr(u);
  return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="yori-rich-external-link">${label}</a>`;
}
