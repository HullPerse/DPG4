export function isObjectArray(value: unknown): boolean {
  if (!Array.isArray(value) || value.length === 0) return false;
  const first = value[0];
  return typeof first === "object" && first !== null && !Array.isArray(first);
}

export function isStringArray(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  if (value.length === 0) return true;
  return value.every(
    (item) =>
      typeof item === "string" ||
      item === null ||
      item === undefined ||
      (typeof item === "object" &&
        item !== null &&
        "value" in item &&
        typeof (item as { value: unknown }).value === "string"),
  );
}

/** Normalizes string[] and legacy { value: string } rows from buggy objectList saves */
export function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (typeof item === "string") return item;
    if (
      item &&
      typeof item === "object" &&
      "value" in item &&
      typeof (item as { value: unknown }).value === "string"
    ) {
      return (item as { value: string }).value;
    }
    if (item === null || item === undefined) return "";
    return String(item);
  });
}
