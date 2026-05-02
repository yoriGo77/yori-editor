import { LEGACY_YORI_IMG_RESIZE_WRAP_CLASS } from "./yori-constants";
import { syncRichCheckboxCheckedAttributeForSave } from "./rich-dehydrate-for-save";
import { yoriTrustedSubtreeInnerHtml } from "./yori-sanitize-html-dom";

/** 语义化 HTML 撤销栈用快照：克隆根、去掉拖拽态 class、同步 checkbox 属性后再取 innerHTML。 */
export function getRichEditorInnerHtmlForUndoSnapshot(root: HTMLElement): string {
  const clone = root.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(`.${LEGACY_YORI_IMG_RESIZE_WRAP_CLASS}.is-dragging`).forEach((el) => {
    el.classList.remove("is-dragging");
  });
  syncRichCheckboxCheckedAttributeForSave(clone);
  return yoriTrustedSubtreeInnerHtml(clone);
}
