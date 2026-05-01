import type { Editor } from 'obsidian';
import type { AlignKind } from './nativeFormat';

export type ProbedStyles = {
  fontFamily: string | null;
  fontSize: string | null;
  color: string | null;
  backgroundColor: string | null;
  textAlign: AlignKind | null;
  lineHeight: string | null;
};

function parseStyleAttr(style: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of style.split(';')) {
    const idx = part.indexOf(':');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim().toLowerCase();
    const val = part.slice(idx + 1).trim();
    if (key) out[key] = val;
  }
  return out;
}

/** 与下拉选项比对用 */
export function normalizeFontFamily(css: string): string {
  return css.replace(/["']/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

interface SpanMatch {
  contentStart: number;
  contentEnd: number;
  style: string;
}

function findInnermostSpanAt(doc: string, offset: number): SpanMatch | null {
  let best: (SpanMatch & { spanLen: number }) | null = null;
  let searchFrom = 0;
  while (true) {
    const open = doc.indexOf('<span', searchFrom);
    if (open === -1 || open > offset) break;
    const gt = doc.indexOf('>', open);
    if (gt === -1) break;
    const openTag = doc.slice(open, gt + 1);
    const sm = /\bstyle\s*=\s*"([^"]*)"/i.exec(openTag);
    if (!sm) {
      searchFrom = open + 5;
      continue;
    }
    const contentStart = gt + 1;
    let pos = contentStart;
    let depth = 1;
    let closeTagStart = -1;
    while (depth > 0 && pos < doc.length) {
      const idxOpen = doc.indexOf('<span', pos);
      const idxClose = doc.indexOf('</span>', pos);
      if (idxClose === -1) break;
      const nextOpen = idxOpen === -1 ? Infinity : idxOpen;
      if (nextOpen < idxClose) {
        depth++;
        pos = nextOpen + 5;
      } else {
        depth--;
        if (depth === 0) closeTagStart = idxClose;
        pos = idxClose + 7;
      }
    }
    if (closeTagStart === -1) {
      searchFrom = open + 5;
      continue;
    }
    if (offset >= contentStart && offset < closeTagStart) {
      const spanLen = closeTagStart + 7 - open;
      const match = { contentStart, contentEnd: closeTagStart, style: sm[1], spanLen };
      if (!best || spanLen < best.spanLen) best = match;
    }
    searchFrom = open + 5;
  }
  return best;
}

interface DivMatch {
  openStart: number;
  contentStart: number;
  contentEnd: number;
  style: string;
}

function findInnermostDivAt(doc: string, offset: number): DivMatch | null {
  let best: (DivMatch & { spanLen: number }) | null = null;
  let searchFrom = 0;
  while (true) {
    const open = doc.indexOf('<div', searchFrom);
    if (open === -1 || open > offset) break;
    const gt = doc.indexOf('>', open);
    if (gt === -1) break;
    const openTag = doc.slice(open, gt + 1);
    const sm = /\bstyle\s*=\s*"([^"]*)"/i.exec(openTag);
    if (!sm) {
      searchFrom = open + 4;
      continue;
    }
    const contentStart = gt + 1;
    let pos = contentStart;
    let depth = 1;
    let closeTagStart = -1;
    while (depth > 0 && pos < doc.length) {
      const idxOpen = doc.indexOf('<div', pos);
      const idxClose = doc.indexOf('</div>', pos);
      if (idxClose === -1) break;
      const nextOpen = idxOpen === -1 ? Infinity : idxOpen;
      if (nextOpen < idxClose) {
        depth++;
        pos = nextOpen + 4;
      } else {
        depth--;
        if (depth === 0) closeTagStart = idxClose;
        pos = idxClose + 6;
      }
    }
    if (closeTagStart === -1) {
      searchFrom = open + 4;
      continue;
    }
    if (offset >= contentStart && offset < closeTagStart) {
      const spanLen = closeTagStart + 6 - open;
      const match = {
        openStart: open,
        contentStart,
        contentEnd: closeTagStart,
        style: sm[1],
        spanLen,
      };
      if (!best || spanLen < best.spanLen) best = match;
    }
    searchFrom = open + 4;
  }
  if (!best) return null;
  return {
    openStart: best.openStart,
    contentStart: best.contentStart,
    contentEnd: best.contentEnd,
    style: best.style,
  };
}

function parseTextAlign(style: string): AlignKind | null {
  const ta = parseStyleAttr(style)['text-align']?.toLowerCase().trim();
  if (ta === 'left' || ta === 'center' || ta === 'right') return ta;
  return null;
}

function parseLineHeight(style: string): string | null {
  const lh = parseStyleAttr(style)['line-height']?.trim();
  return lh || null;
}

/** 向外逐层查找含 text-align / line-height 的 div */
export function probeStyles(editor: Editor): ProbedStyles {
  const doc = editor.getValue();
  const from = editor.posToOffset(editor.getCursor('from'));
  const to = editor.posToOffset(editor.getCursor('to'));
  const head = Math.min(from, to);

  const span = findInnermostSpanAt(doc, head);
  let fontFamily: string | null = null;
  let fontSize: string | null = null;
  let color: string | null = null;
  let backgroundColor: string | null = null;
  if (span) {
    const map = parseStyleAttr(span.style);
    fontFamily = map['font-family'] ?? null;
    fontSize = map['font-size'] ?? null;
    color = map['color'] ?? null;
    backgroundColor = map['background-color'] ?? null;
  }

  let textAlign: AlignKind | null = null;
  let lineHeight: string | null = null;
  let scanPos = head;
  while (scanPos >= 0) {
    const div = findInnermostDivAt(doc, scanPos);
    if (!div) break;
    if (!textAlign) {
      const ta = parseTextAlign(div.style);
      if (ta) textAlign = ta;
    }
    if (!lineHeight) {
      const lh = parseLineHeight(div.style);
      if (lh) lineHeight = lh;
    }
    if (textAlign && lineHeight) break;
    if (div.openStart <= 0) break;
    scanPos = div.openStart - 1;
  }

  return {
    fontFamily,
    fontSize,
    color,
    backgroundColor,
    textAlign,
    lineHeight,
  };
}
