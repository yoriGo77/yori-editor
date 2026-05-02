/** contenteditable 内点击目标常为 Text 节点；Shadow DOM 下 `target` 会指向宿主，需 `composedPath` 取真实命中 */
export function richPointerTargetElement(evt: Event): HTMLElement | null {
  if (typeof evt.composedPath === "function") {
    for (const n of evt.composedPath()) {
      if (n instanceof HTMLElement) return n;
      if (n instanceof Text) return n.parentElement;
    }
  }
  const raw = evt.target;
  if (raw instanceof HTMLElement) return raw;
  if (raw instanceof Text) return raw.parentElement;
  return null;
}

export function getClosestRichTableCellFromTarget(target: EventTarget | null): HTMLTableCellElement | null {
  const element =
    target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
  if (!element) return null;
  return element.closest("td, th");
}
