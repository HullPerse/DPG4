import { useRecordContext } from "react-admin";
import { formatAlignedJsonText } from "../jsonAlign";

const jsonPreStyle: React.CSSProperties = {
  margin: 0,
  maxWidth: "100%",
  whiteSpace: "pre",
  overflowX: "auto",
  fontSize: 13,
  lineHeight: 1.5,
  fontFamily: 'ui-monospace, "Cascadia Code", Consolas, monospace',
};

export function JsonField({
  source,
  maxChars,
}: {
  source: string;
  maxChars?: number;
}) {
  const record = useRecordContext();
  if (!record) return null;
  const val = record[source];
  if (val === null || val === undefined || val === "") return <span>—</span>;
  const pretty = formatAlignedJsonText(val);
  const shown =
    maxChars && pretty.length > maxChars
      ? `${pretty.slice(0, maxChars)}…`
      : pretty;
  return <pre style={jsonPreStyle}>{shown}</pre>;
}
