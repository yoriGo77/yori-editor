import { sanitizeHTMLToDom } from "obsidian";

import { escapeHtml } from "./rich-html-escape";
import { yoriDetachedEl } from "./yori-detached-dom";

/**
 * 原生 Markdown 源里若已含 HTML（如从高级模式带回的 span/div），不应再整行 escape，否则高级里会看见字面量标签。
 * 纯文本/Markdown 仍走 escape；对疑似 HTML 用 DOMParser 包一层 span 再取 innerHTML，避免误伤「3 < 4」等极少数写法。
 */
export function lineMayContainTrustedHtmlFragment(line: string): boolean {
  if (!line.includes("<")) return false;
  const lower = line.toLowerCase();
  if (
    /<script\b|<iframe\b|<object\b|<embed\b|<link\b|<meta\b|<style\b|<base\b|<template\b/i.test(lower)
  ) {
    return false;
  }
  if (/\son[a-z]+\s*=/i.test(line)) return false;
  if (/^[\s\uFEFF]*javascript:/i.test(line.trim())) return false;
  return true;
}

/** 列表项内文：若含可信 HTML 则用解析结果，否则 escape（与段落行策略一致）。 */
export function richInlineTextFromMarkdownSegment(segment: string): string {
  const s = segment;
  if (!s) return "";
  if (lineMayContainTrustedHtmlFragment(s)) {
    try {
      const doc = new DOMParser().parseFromString(`<span>${s}</span>`, "text/html");
      const span = doc.body.querySelector("span");
      if (span) return span.innerHTML;
    } catch {
      /* fall through */
    }
  }
  return escapeHtml(s);
}

export function lineToInitialRichParagraphHtml(line: string): string {
  if (!line.trim()) return "<p><br></p>";
  if (!lineMayContainTrustedHtmlFragment(line)) {
    return `<p>${escapeHtml(line)}</p>`;
  }
  try {
    const holder = yoriDetachedEl("div");
    holder.appendChild(sanitizeHTMLToDom(line));
    const p = yoriDetachedEl("p");
    while (holder.firstChild) {
      p.appendChild(holder.firstChild);
    }
    if (p.childNodes.length === 0) {
      return "<p><br></p>";
    }
    return p.outerHTML;
  } catch {
    return `<p>${escapeHtml(line)}</p>`;
  }
}

/**
 * 将当前行开头的 Markdown 列表行分类（忽略行前空白），供原生→高级时转成真实 ul/ol/任务列表。
 */
export function classifyMarkdownListLineForRich(line: string): "bullet" | "ordered" | "task" | null {
  const t = line.replace(/^\s+/, "");
  if (!t) return null;
  if (/^-\s+\[[^\]]+\]/.test(t)) return "task";
  if (/^\d+\.\s+/.test(t)) return "ordered";
  if (/^[-*+]\s+/.test(t)) return "bullet";
  return null;
}

export function parseOneMarkdownListLineForRich(
  line: string,
  kind: "bullet" | "ordered" | "task"
): string | { status: string; text: string } | undefined {
  const t = line.replace(/^\s+/, "");
  if (kind === "task") {
    const m = t.match(/^-\s+\[([^\]]*)\]\s*(.*)$/);
    if (!m) return undefined;
    return { status: m[1] ?? "", text: m[2] ?? "" };
  }
  if (kind === "bullet") {
    const m = t.match(/^[-*+]\s+(.*)$/);
    if (!m) return undefined;
    return m[1] ?? "";
  }
  const m = t.match(/^\d+\.\s+(.*)$/);
  if (!m) return undefined;
  return m[1] ?? "";
}

/**
 * 从 start 起消费连续、同类型的 Markdown 列表行，生成可在 contenteditable 中直接渲染的列表 HTML。
 */
export function tryMarkdownListRunToRichHtml(
  lines: string[],
  start: number
): { html: string; end: number } | null {
  const first = lines[start];
  if (first === undefined) return null;
  const kind = classifyMarkdownListLineForRich(first);
  if (!kind) return null;

  const chunks: Array<string | { status: string; text: string }> = [];
  let j = start;
  while (j < lines.length) {
    const line = lines[j] ?? "";
    if (!line.trim()) break;
    if (classifyMarkdownListLineForRich(line) !== kind) break;
    const parsed = parseOneMarkdownListLineForRich(line, kind);
    if (parsed === undefined) break;
    chunks.push(parsed);
    j++;
  }
  if (chunks.length === 0) return null;

  if (kind === "ordered") {
    const lis = (chunks as string[])
      .map((t) => `<li>${richInlineTextFromMarkdownSegment(t)}</li>`)
      .join("");
    return { html: `<ol>${lis}</ol>`, end: j };
  }

  if (kind === "bullet") {
    const lis = (chunks as string[])
      .map((t) => `<li>${richInlineTextFromMarkdownSegment(t)}</li>`)
      .join("");
    return { html: `<ul>${lis}</ul>`, end: j };
  }

  const lis = (chunks as Array<{ status: string; text: string }>)
    .map(({ status, text }) => {
      const done = /x/i.test(status);
      const inner = text.trim() ? richInlineTextFromMarkdownSegment(text) : "<br>";
      return `<li class="task-list-item"><input type="checkbox" class="task-list-item-checkbox"${done ? " checked" : ""} />${inner}</li>`;
    })
    .join("");
  return { html: `<ul class="contains-task-list">${lis}</ul>`, end: j };
}

/** 解析管道表格一行内的单元格（GFM 风格，外围 `|` 可选）。 */
function splitMarkdownTableCells(row: string): string[] {
  let inner = row.trim();
  if (!inner) return [];
  if (inner.startsWith("|")) inner = inner.slice(1);
  if (inner.endsWith("|")) inner = inner.slice(0, -1);
  return inner.split("|").map((c) => c.trim());
}

function isMarkdownTableSeparatorRow(line: string): boolean {
  const cells = splitMarkdownTableCells(line);
  if (cells.length === 0) return false;
  return cells.every((c) => /^:?-{2,}:?$/.test(c));
}

/** 疑似表格数据行：以 `|` 开头且至少分成两列（与列表 `- xxx` 区分）。 */
function isProbablyMarkdownTableRow(line: string): boolean {
  const t = line.trim();
  if (!t.startsWith("|")) return false;
  const cells = splitMarkdownTableCells(line);
  return cells.length >= 2;
}

/**
 * 连续管道表格（可选表头 + 分隔行）→ HTML table，供原生 Markdown → 高级编辑初载。
 */
export function tryMarkdownTableRunToRichHtml(
  lines: string[],
  start: number
): { html: string; end: number } | null {
  const first = lines[start];
  if (first === undefined || !isProbablyMarkdownTableRow(first)) return null;

  const chunk: string[] = [];
  let j = start;
  while (j < lines.length) {
    const line = lines[j] ?? "";
    if (!line.trim()) break;
    if (!isProbablyMarkdownTableRow(line)) break;
    chunk.push(line);
    j++;
  }
  if (chunk.length === 0) return null;

  let headerCells: string[] | null = null;
  let bodySourceLines: string[];

  if (chunk.length >= 2 && isMarkdownTableSeparatorRow(chunk[1] ?? "")) {
    const hdr = splitMarkdownTableCells(chunk[0] ?? "");
    const sep = splitMarkdownTableCells(chunk[1] ?? "");
    if (hdr.length === sep.length && hdr.length >= 2) {
      headerCells = hdr;
      bodySourceLines = chunk.slice(2);
    } else {
      bodySourceLines = [...chunk];
    }
  } else {
    bodySourceLines = [...chunk];
  }

  const bodyRows = bodySourceLines
    .filter((ln) => !isMarkdownTableSeparatorRow(ln))
    .map((ln) => splitMarkdownTableCells(ln));

  const colCount = Math.max(headerCells?.length ?? 0, ...bodyRows.map((r) => r.length), 2);

  const rowHtml = (cells: string[], tag: "th" | "td"): string => {
    let out = "<tr>";
    for (let c = 0; c < colCount; c++) {
      const raw = cells[c] ?? "";
      const inner = raw.trim() ? richInlineTextFromMarkdownSegment(raw) : "<br>";
      out += `<${tag}>${inner}</${tag}>`;
    }
    out += "</tr>";
    return out;
  };

  let html = "<table>";
  if (headerCells && headerCells.length > 0) {
    html += `<thead>${rowHtml(headerCells, "th")}</thead>`;
  }
  html += "<tbody>";
  for (const row of bodyRows) {
    html += rowHtml(row, "td");
  }
  html += "</tbody></table>";

  return { html, end: j };
}

export function markdownToInitialRichHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const parts: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const raw = lines[i] ?? "";
    if (!raw.trim()) {
      parts.push("<p><br></p>");
      i++;
      continue;
    }
    const listRun = tryMarkdownListRunToRichHtml(lines, i);
    if (listRun) {
      parts.push(listRun.html);
      i = listRun.end;
      continue;
    }
    const tableRun = tryMarkdownTableRunToRichHtml(lines, i);
    if (tableRun) {
      parts.push(tableRun.html);
      i = tableRun.end;
      continue;
    }
    parts.push(lineToInitialRichParagraphHtml(raw));
    i++;
  }
  return parts.join("");
}
