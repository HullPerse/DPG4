/** Убирает BLOB из JSON и добавляет флаги hasImage / hasAudio */

type FileField = "image" | "audio";

export function serializeRow<T extends Record<string, unknown>>(
  row: T,
  fileFields: FileField[] = ["image"],
): Omit<T, FileField | `${FileField}Mime`> & {
  hasImage?: boolean;
  hasAudio?: boolean;
} {
  const out = { ...row } as Record<string, unknown>;

  for (const field of fileFields) {
    const mimeKey = `${field}Mime`;
    const hasKey = field === "image" ? "hasImage" : "hasAudio";
    out[hasKey] = Boolean(row[field]);
    delete out[field];
    delete out[mimeKey];
  }

  return out as Omit<T, FileField | `${FileField}Mime`> & {
    hasImage?: boolean;
    hasAudio?: boolean;
  };
}
