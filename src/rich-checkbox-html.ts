/**
 * 高级编辑 / YORI inner：checkbox 与源码 HTML 串之间的勾选同步（attributes ↔ DOM ↔ 解析序）。
 */

/** 从磁盘/撤销栈注入 innerHTML 后，将 checked 属性同步到 IDL（少数环境在表格等场景下初始 property 不准）。 */
export function applyRichCheckboxCheckedStateFromAttributesAfterLoad(root: HTMLElement | null): void {
  if (!root) return;
  for (const inp of Array.from(root.querySelectorAll('input[type="checkbox"]'))) {
    if (!(inp instanceof HTMLInputElement)) continue;
    const a = inp.getAttribute("checked");
    inp.checked = inp.hasAttribute("checked") && a !== "false";
    inp.defaultChecked = inp.checked;
  }
}

export function isRichHtmlCheckboxInputOpenTag(tag: string): boolean {
  return (
    /\btype\s*=\s*["']checkbox["']/i.test(tag) || /\btype\s*=\s*checkbox(?:\s|\/?>|\/)/i.test(tag)
  );
}

export function richHtmlCheckboxOpenTagImpliesChecked(tag: string): boolean {
  const stripped = tag.replace(/="[^"]*"/gi, '=""').replace(/='[^']*'/gi, "=''");
  if (/\bchecked\s*=/i.test(stripped)) {
    if (/\bchecked\s*=\s*["']?\s*false/i.test(stripped)) return false;
    if (/\bchecked\s*=\s*["']?\s*0\b/i.test(stripped)) return false;
    return true;
  }
  return /\bchecked\b/i.test(stripped);
}

/** 从即将写入富文本根的 HTML 串解析各 checkbox 是否勾选（以源码为准，不依赖 innerHTML 解析后的 IDL）。 */
export function extractRichCheckboxCheckedFlagsFromHtmlFragment(html: string): boolean[] {
  const out: boolean[] = [];
  const re = /<input\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const tag = m[0];
    if (!isRichHtmlCheckboxInputOpenTag(tag)) continue;
    out.push(richHtmlCheckboxOpenTagImpliesChecked(tag));
  }
  return out;
}

/** 按文档中 checkbox 出现顺序，把源码中的勾选意图写回 DOM（与 extract 配套）。 */
export function applyRichCheckboxCheckedFlagsToEditorInTreeOrder(root: HTMLElement | null, flags: boolean[]): void {
  if (!root || flags.length === 0) return;
  const inputs = Array.from(root.querySelectorAll('input[type="checkbox"]')) as HTMLInputElement[];
  const n = Math.min(flags.length, inputs.length);
  for (let i = 0; i < n; i++) {
    const on = flags[i] ?? false;
    inputs[i].checked = on;
    inputs[i].defaultChecked = on;
    if (on) inputs[i].setAttribute("checked", "");
    else inputs[i].removeAttribute("checked");
  }
}
