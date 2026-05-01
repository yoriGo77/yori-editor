/** DataTransfer 快照与异步读取字符串项（供拖拽/粘贴解析）。 */

export function snapshotRichDataTransferSync(dt: DataTransfer): {
  files: File[];
  payloads: Record<string, string>;
} {
  const files: File[] = [];
  const seen = new Set<File>();
  try {
    const n = dt.files?.length ?? 0;
    for (let i = 0; i < n; i++) {
      const f = dt.files.item(i);
      if (f) {
        files.push(f);
        seen.add(f);
      }
    }
  } catch {
    // ignore
  }
  try {
    for (const item of Array.from(dt.items ?? [])) {
      if (item.kind !== "file") continue;
      const f = item.getAsFile();
      if (f && !seen.has(f)) {
        seen.add(f);
        files.push(f);
      }
    }
  } catch {
    /* ignore */
  }
  const payloads: Record<string, string> = {};
  for (const t of Array.from(dt.types ?? [])) {
    try {
      payloads[t] = dt.getData(t);
    } catch {
      payloads[t] = "";
    }
  }
  return { files, payloads };
}

/** 侧栏拖拽笔记时，路径常在 string item 里，仅用 getData 同步读会得到空串 */
export async function pullDataTransferStringItemsAsync(dt: DataTransfer): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const items = Array.from(dt.items ?? []).filter((it) => it.kind === "string");
  await Promise.all(
    items.map(
      (item) =>
        new Promise<void>((resolve) => {
          try {
            const mime = item.type || "text/plain";
            item.getAsString((s) => {
              if (s && s.length > 0) {
                out[mime] = out[mime] ? `${out[mime]}\n${s}` : s;
              }
              resolve();
            });
          } catch {
            resolve();
          }
        })
    )
  );
  return out;
}
