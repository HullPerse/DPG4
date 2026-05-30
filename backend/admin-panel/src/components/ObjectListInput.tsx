import { Copy, GripVertical, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { FieldSection } from "@/components/FieldSection";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { resolveColumnMeta } from "@/lib/columnMeta";
import type { AdminFieldMeta } from "@/types";

function inferColumns(
  rows: Record<string, unknown>[],
  preferred?: string[],
): string[] {
  if (preferred?.length) return preferred;
  const first = rows[0];
  if (!first) return ["id", "name"];
  const keys = Object.keys(first);
  if (keys.includes("id") && keys.includes("name")) {
    return ["id", "name", ...keys.filter((k) => k !== "id" && k !== "name")];
  }
  return keys.slice(0, 8);
}

function normalizeRows(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.map((row) =>
    row && typeof row === "object" && !Array.isArray(row)
      ? { ...(row as Record<string, unknown>) }
      : { value: row },
  );
}

function ObjectListCell({
  fieldMeta,
  column,
  row,
  onChange,
}: {
  fieldMeta: AdminFieldMeta;
  column: string;
  row: Record<string, unknown>;
  onChange: (val: unknown) => void;
}) {
  const val = row[column];
  const meta = resolveColumnMeta(fieldMeta, column, val);

  if (meta.kind === "boolean" || typeof val === "boolean") {
    return (
      <Checkbox
        checked={!!val}
        onChange={(e) => onChange(e.target.checked)}
      />
    );
  }

  if (meta.kind === "select" && meta.choices?.length) {
    return (
      <Select
        className="h-8 text-xs"
        value={val === undefined || val === null ? "" : String(val)}
        onChange={(v) => onChange(v)}
        options={meta.choices}
        allowEmpty
      />
    );
  }

  if (meta.kind === "number" || column === "id") {
    return (
      <Input
        className="h-8 text-xs"
        type="number"
        value={val === undefined || val === null ? "" : String(val)}
        onChange={(e) =>
          onChange(e.target.value === "" ? "" : Number(e.target.value))
        }
      />
    );
  }

  const str = val === undefined || val === null ? "" : String(val);
  if (str.length > 48 || column.includes("image") || column.includes("Link")) {
    return (
      <textarea
        className="border-iris bg-background text-text min-h-[56px] w-full min-w-[140px] border-2 p-1.5 text-xs"
        value={str}
        rows={2}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  return (
    <Input
      className="h-8 text-xs"
      value={str}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function ObjectListInput({
  source,
  fieldMeta,
  value,
  onChange,
  changed,
}: {
  source: string;
  fieldMeta: AdminFieldMeta;
  value: unknown;
  onChange: (v: Record<string, unknown>[]) => void;
  changed?: boolean;
}) {
  const rows = useMemo(() => normalizeRows(value), [value]);
  const columns = useMemo(
    () => inferColumns(rows, fieldMeta.objectListColumns),
    [rows, fieldMeta.objectListColumns],
  );
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const commit = (next: Record<string, unknown>[]) => onChange(next);

  const updateCell = (rowIndex: number, col: string, val: unknown) => {
    const next = rows.map((r, i) => {
      if (i !== rowIndex) return r;
      return { ...r, [col]: val };
    });
    commit(next);
  };

  const addRow = () => {
    const blank: Record<string, unknown> = {};
    for (const col of columns) {
      const meta = resolveColumnMeta(fieldMeta, col, undefined);
      if (meta.kind === "boolean") blank[col] = false;
      else if (meta.kind === "number" || col === "id") blank[col] = 0;
      else blank[col] = "";
    }
    commit([...rows, blank]);
  };

  const duplicateRow = (index: number) => {
    const copy = { ...rows[index]! };
    const next = [...rows];
    next.splice(index + 1, 0, copy);
    commit(next);
  };

  const removeRow = (index: number) => commit(rows.filter((_, i) => i !== index));

  const onDrop = (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) return;
    const next = [...rows];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved!);
    commit(next);
    setDragIndex(null);
  };

  return (
    <FieldSection
      title={source}
      variant="list"
      changed={changed}
      badge={`список · ${rows.length}`}
      hint="Перетащите строку за ⋮⋮. Длинные поля — многострочные."
    >
      {rows.length === 0 ? (
        <p className="text-muted border-highlight-high mb-3 border-2 border-dashed p-6 text-center text-sm">
          Нет элементов — добавьте первую строку
        </p>
      ) : (
        <div className="border-highlight-high max-h-80 overflow-auto overscroll-contain border-2">
          <table className="w-full min-w-max text-sm">
            <thead className="bg-highlight-low sticky top-0 z-10">
              <tr>
                <th className="text-muted w-8 border border-highlight-high px-1 py-1 text-center text-[10px] font-bold">
                  #
                </th>
                <th className="w-8" />
                {columns.map((col) => (
                  <th
                    key={col}
                    className="border-highlight-high text-muted border px-2 py-1 text-left text-xs font-bold uppercase"
                  >
                    {col}
                  </th>
                ))}
                <th className="w-20" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  draggable
                  onDragStart={() => setDragIndex(rowIndex)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDrop(rowIndex)}
                  className={
                    rowIndex % 2 === 0 ? "bg-background/40" : "bg-highlight-low/30"
                  }
                >
                  <td className="border-highlight-high text-muted border px-1 py-1 text-center text-xs font-bold">
                    {rowIndex + 1}
                  </td>
                  <td className="border-highlight-high border px-1 text-center">
                    <GripVertical
                      className={`text-muted mx-auto size-4 cursor-grab ${dragIndex === rowIndex ? "text-primary" : ""}`}
                    />
                  </td>
                  {columns.map((col) => (
                    <td
                      key={col}
                      className="border-highlight-high border px-1 py-1 align-top"
                    >
                      <ObjectListCell
                        fieldMeta={fieldMeta}
                        column={col}
                        row={row}
                        onChange={(v) => updateCell(rowIndex, col, v)}
                      />
                    </td>
                  ))}
                  <td className="border-highlight-high border px-1 text-center">
                    <div className="flex justify-center gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="Дублировать"
                        onClick={() => duplicateRow(rowIndex)}
                      >
                        <Copy className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="Удалить"
                        onClick={() => removeRow(rowIndex)}
                      >
                        <Trash2 className="text-love size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Button type="button" variant="outline" size="sm" className="mt-3" onClick={addRow}>
        <Plus />
        Добавить строку
      </Button>
    </FieldSection>
  );
}
