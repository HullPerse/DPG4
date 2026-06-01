export function nowIso(): string {
  return new Date().toISOString();
}

export function formatRecordDate(value: string | Date | number | null | undefined): string {
  if (!value) return nowIso();
  if (typeof value === "string") return value;
  return new Date(value).toISOString();
}
