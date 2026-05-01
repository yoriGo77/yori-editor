import type { App } from "obsidian";
import { TFile } from "obsidian";
import {
  ATTACHMENT_AUDIO_EXTENSIONS,
  ATTACHMENT_IMAGE_EXTENSIONS,
  ATTACHMENT_PDF_EXTENSIONS,
  ATTACHMENT_RECORDING_EXTENSIONS,
  ATTACHMENT_VIDEO_EXTENSIONS
} from "./yori-constants";

/** 拖入/导入的库内文件转为插入用的 Markdown（嵌入类用 ![[…]]，其余走 fileManager 或 [[…]]）。 */
export function markdownLinkForDroppedVaultFile(app: App, dest: TFile, sourcePath: string): string {
  const ext = dest.extension.toLowerCase();
  const inner = app.metadataCache.fileToLinktext(dest, sourcePath, true);
  if (
    ATTACHMENT_IMAGE_EXTENSIONS.has(ext) ||
    ATTACHMENT_VIDEO_EXTENSIONS.has(ext) ||
    ATTACHMENT_AUDIO_EXTENSIONS.has(ext) ||
    ATTACHMENT_RECORDING_EXTENSIONS.has(ext) ||
    ATTACHMENT_PDF_EXTENSIONS.has(ext)
  ) {
    return `![[${inner}]]`;
  }
  const gen = app.fileManager.generateMarkdownLink(dest, sourcePath).trim();
  if (gen.length > 0) return gen;
  return `[[${inner}]]`;
}

/** 用户选择/拖入的外部文件：复制到库内附件路径并返回新文件 */
export async function copyFileIntoVaultAsAttachment(app: App, file: File, sourcePath: string): Promise<TFile> {
  const buf = await file.arrayBuffer();
  const rawName = (file.name || "file").replace(/[\\/]/g, "");
  const destPath = await app.fileManager.getAvailablePathForAttachment(rawName, sourcePath);
  return app.vault.createBinary(destPath, buf);
}
