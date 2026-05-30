import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { listRecords } from "@/lib/data";
import { Select } from "@/components/ui/select";
import type { AdminFieldMeta } from "@/types";

type RefRow = Record<string, unknown>;

export function ReferenceSelect({
  field,
  value,
  onChange,
}: {
  field: AdminFieldMeta;
  value: unknown;
  onChange: (v: string) => void;
}) {
  const ref = field.reference!;
  const [rows, setRows] = useState<RefRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listRecords(ref.table, { perPage: 300, sortField: "id", sortOrder: "ASC" })
      .then((r) => setRows(r.data))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [ref.table]);

  const options = rows.map((row) => {
    const id = String(row.id ?? "");
    const label = String(row[ref.labelField] ?? id);
    return { value: id, label: `${label} (${id})` };
  });

  const current = value === undefined || value === null ? "" : String(value);

  if (loading) {
    return (
      <div className="text-muted flex h-10 items-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Загрузка…
      </div>
    );
  }

  return (
    <Select
      value={current}
      onChange={onChange}
      options={options}
      placeholder={`Выберите ${ref.table}…`}
      allowEmpty
    />
  );
}
