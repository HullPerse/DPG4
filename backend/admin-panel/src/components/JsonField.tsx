import { formatAlignedJsonText } from "@/jsonAlign";

const jsonPreClass =
  "m-0 max-w-full overflow-x-auto font-mono text-xs leading-relaxed whitespace-pre";

export function JsonField({
  value,
  maxChars,
}: {
  value: unknown;
  maxChars?: number;
}) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted">—</span>;
  }
  const pretty = formatAlignedJsonText(value);
  const shown =
    maxChars && pretty.length > maxChars
      ? `${pretty.slice(0, maxChars)}…`
      : pretty;
  return <pre className={jsonPreClass}>{shown}</pre>;
}
