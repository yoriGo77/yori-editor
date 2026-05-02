/**
 * Obsidian 在 Node 上实现 createEl：会把新节点 append 到 **this**。
 * 对 `document` 调用会变成往 document 挂第二个元素根，触发
 * HierarchyRequestError: Only one element on document allowed。
 * 先用 Obsidian `createFragment()` 作临时父级（等价于 DocumentFragment，且不挂到 document 根），再把节点挪到 rich 树或别处。
 */
export function yoriDetachedEl<K extends keyof HTMLElementTagNameMap>(tag: K): HTMLElementTagNameMap[K] {
  const frag = createFragment();
  return frag.createEl(tag);
}
