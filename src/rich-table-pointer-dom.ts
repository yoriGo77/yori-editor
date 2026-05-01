/** contenteditable 内点击目标常为 Text 节点，需落到父 Element 才能用 closest */
export function richPointerTargetElement(evt: Event): HTMLElement | null {
  const raw = evt.target;
  if (raw instanceof HTMLElement) return raw;
  if (raw instanceof Text) return raw.parentElement;
  return null;
}

export function getClosestRichTableCellFromTarget(target: EventTarget | null): HTMLTableCellElement | null {
  const element =
    target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
  if (!element) return null;
  return element.closest("td, th") as HTMLTableCellElement | null;
}
