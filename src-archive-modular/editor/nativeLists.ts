import type { Editor } from 'obsidian';

function replaceLine(editor: Editor, line: number, newText: string): void {
  const old = editor.getLine(line);
  editor.replaceRange(newText, { line, ch: 0 }, { line, ch: old.length });
}

/** 文本符号列表（Obsidian 原生语法） */
export function toggleBullet(editor: Editor): void {
  const line = editor.getCursor().line;
  const t = editor.getLine(line);
  const numbered = /^(\d+)\.\s/.exec(t);
  const todo = /^-\s\[[ x]\]\s/.exec(t);
  if (/^-\s/.test(t) && !todo) {
    replaceLine(editor, line, t.replace(/^-\s/, ''));
    return;
  }
  let s = t;
  if (numbered) s = s.replace(/^(\d+)\.\s/, '');
  if (todo) s = s.replace(/^-\s\[[ x]\]\s/, '');
  replaceLine(editor, line, s.startsWith('- ') ? s : '- ' + s);
}

export function toggleNumbered(editor: Editor): void {
  const line = editor.getCursor().line;
  const t = editor.getLine(line);
  const bullet = /^-\s/.test(t) && !/^-\s\[[ x]\]\s/.test(t);
  const todo = /^-\s\[[ x]\]\s/.test(t);
  if (/^\d+\.\s/.test(t)) {
    replaceLine(editor, line, t.replace(/^\d+\.\s/, ''));
    return;
  }
  let s = t;
  if (bullet) s = s.replace(/^-\s/, '');
  if (todo) s = s.replace(/^-\s\[[ x]\]\s/, '');
  replaceLine(editor, line, /^\d+\.\s/.test(s) ? s : `1. ${s}`);
}

export function toggleTodo(editor: Editor): void {
  const line = editor.getCursor().line;
  const t = editor.getLine(line);
  if (/^-\s\[[ x]\]\s/.test(t)) {
    replaceLine(editor, line, t.replace(/^-\s\[[ x]\]\s/, ''));
    return;
  }
  let s = t.replace(/^-\s/, '').replace(/^\d+\.\s/, '');
  replaceLine(editor, line, `- [ ] ${s}`);
}

export function insertHorizontalRule(editor: Editor): void {
  const cursor = editor.getCursor();
  editor.replaceRange('\n\n---\n\n', cursor);
}
