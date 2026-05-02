/**
 * 标准 `contains` 对 ShadowRoot 内的节点常返回 false（子树在本页但不在 light DOM 链上）。
 * Live Preview 常把块级 HTML 放进 open shadow；判断是否归属某容器时需沿 shadow host 向上试探。
 */
export function containerContainsNodeShadowAware(container: HTMLElement, node: Node | null): boolean {
  if (!node) return false;
  let cur: Node | null = node;
  const seen = new Set<Node>();
  while (cur && seen.size < 128) {
    if (seen.has(cur)) break;
    seen.add(cur);
    try {
      if (container.contains(cur)) return true;
    } catch {
      return false;
    }
    const rn = cur.getRootNode();
    if (rn.instanceOf(ShadowRoot)) {
      cur = rn.host;
      continue;
    }
    cur = cur.parentNode;
  }
  return false;
}

/** 含各层 open ShadowRoot 内的 table（与 container.querySelectorAll("table") 互补）。 */
export function collectHtmlTablesDeep(container: HTMLElement): HTMLTableElement[] {
  const acc: HTMLTableElement[] = [];
  const visit = (root: ParentNode): void => {
    root.querySelectorAll("table").forEach((t) => acc.push(t));
    root.querySelectorAll("*").forEach((el) => {
      if (el.instanceOf(Element) && el.shadowRoot) visit(el.shadowRoot);
    });
  };
  visit(container);
  return acc;
}
