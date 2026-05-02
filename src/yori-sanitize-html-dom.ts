import { sanitizeHTMLToDom } from "obsidian";

/** 用 Obsidian 消毒后的 DOM 替换元素子节点，避免直接写 innerHTML。 */
export function yoriReplaceChildrenFromSanitizedHtml(el: HTMLElement, html: string): void {
  el.empty();
  el.appendChild(sanitizeHTMLToDom(html));
}

export function yoriFillWithSingleBr(el: HTMLElement): void {
  el.empty();
  el.createEl("br");
}

export function yoriFillCheckboxBrCell(el: HTMLElement, checked: boolean): void {
  el.empty();
  const inp = el.createEl("input", { type: "checkbox" });
  if (checked) inp.checked = true;
  el.createEl("br");
}
