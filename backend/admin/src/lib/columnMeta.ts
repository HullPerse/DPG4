import type { AdminChoice, AdminColumnMeta, AdminFieldMeta } from "@/types";

export function resolveColumnMeta(
  fieldMeta: AdminFieldMeta,
  column: string,
  sample: unknown,
): AdminColumnMeta {
  const explicit = fieldMeta.columns?.[column];
  if (explicit) return explicit;

  if (column === "id" || column.endsWith("Id")) return { kind: "number" };
  if (typeof sample === "boolean") return { kind: "boolean" };
  if (typeof sample === "number") return { kind: "number" };
  return { kind: "text" };
}

export function columnChoices(meta: AdminColumnMeta): AdminChoice[] | undefined {
  return meta.choices;
}
