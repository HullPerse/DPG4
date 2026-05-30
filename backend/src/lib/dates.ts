import { formatISO } from "date-fns";

export function nowIso(): string {
  return formatISO(new Date());
}

export function formatRecordDate(value: string | Date | number | null | undefined): string {
  if (!value) return nowIso();
  if (typeof value === "string") return value;
  return formatISO(new Date(value));
}
