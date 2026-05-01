/** 带样式的 HTML 表格，便于在预览中呈现边框与表头底纹（非 pipe Markdown） */

import type { Editor } from 'obsidian';

export function insertMarkdownPipeTable(editor: Editor): void {
  const header = '| 标题1 | 标题2 | 标题3 |';
  const sep = '| --- | --- | --- |';
  const row = '|  |  |  |';
  editor.replaceSelection(`\n${header}\n${sep}\n${row}\n`);
}

export function insertHtmlTable2x3(editor: Editor): void {
  const border = '#dfd7c9';
  const headBg = '#efe8e0';
  const cellBg = '#ffffff';
  const html = `<table style="border-collapse:collapse;width:100%;margin:1em 0;border:2px solid ${border};">
<thead>
<tr style="background:${headBg};">
<th style="border:1px solid ${border};padding:10px 12px;text-align:center;">标题1</th>
<th style="border:1px solid ${border};padding:10px 12px;text-align:center;">标题2</th>
<th style="border:1px solid ${border};padding:10px 12px;text-align:center;">标题3</th>
</tr>
</thead>
<tbody>
<tr style="background:${cellBg};">
<td style="border:1px solid ${border};padding:10px 12px;"></td>
<td style="border:1px solid ${border};padding:10px 12px;"></td>
<td style="border:1px solid ${border};padding:10px 12px;"></td>
</tr>
</tbody>
</table>`;
  editor.replaceSelection(`\n\n${html}\n\n`);
}
