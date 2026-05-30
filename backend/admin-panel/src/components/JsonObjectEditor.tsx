import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function valueKind(v: unknown): "string" | "number" | "boolean" | "object" | "null" {
  if (v === null || v === undefined) return "null";
  if (typeof v === "boolean") return "boolean";
  if (typeof v === "number") return "number";
  if (isPlainObject(v) || Array.isArray(v)) return "object";
  return "string";
}

export function JsonObjectEditor({
  value,
  onChange,
}: {
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
}) {
  const entries = useMemo(() => Object.entries(value), [value]);
  const [newKey, setNewKey] = useState("");

  const setKey = (oldKey: string, newK: string, val: unknown) => {
    const next = { ...value };
    delete next[oldKey];
    if (newK) next[newK] = val;
    onChange(next);
  };

  const setVal = (key: string, val: unknown) => {
    onChange({ ...value, [key]: val });
  };

  const removeKey = (key: string) => {
    const next = { ...value };
    delete next[key];
    onChange(next);
  };

  const addKey = () => {
    const k = newKey.trim();
    if (!k || k in value) return;
    onChange({ ...value, [k]: "" });
    setNewKey("");
  };

  if (!entries.length) {
    return (
      <div className="text-muted border-highlight-high border-2 border-dashed p-4 text-center text-sm">
        <p>Объект пуст</p>
        <div className="mt-3 flex justify-center gap-2">
          <Input
            className="max-w-[200px]"
            placeholder="имя поля"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addKey()}
          />
          <Button type="button" variant="outline" size="sm" onClick={addKey}>
            <Plus className="size-4" />
            Поле
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {entries.map(([key, val]) => (
        <div
          key={key}
          className="border-highlight-high hover:border-iris/40 grid grid-cols-[minmax(120px,1fr)_minmax(0,2fr)_auto] items-start gap-2 border-2 bg-background/60 p-2"
        >
          <Input
            className="h-8 text-xs font-bold"
            value={key}
            onChange={(e) => setKey(key, e.target.value, val)}
          />
          <CellValueEditor value={val} onChange={(v) => setVal(key, v)} />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeKey(key)}
            aria-label="Удалить поле"
          >
            <Trash2 className="text-love size-4" />
          </Button>
        </div>
      ))}
      <div className="flex gap-2">
        <Input
          className="h-8 max-w-[200px] text-xs"
          placeholder="новое поле"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addKey()}
        />
        <Button type="button" variant="outline" size="sm" onClick={addKey}>
          <Plus className="size-4" />
          Добавить поле
        </Button>
      </div>
    </div>
  );
}

function CellValueEditor({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const kind = valueKind(value);

  if (kind === "boolean") {
    return (
      <label className="flex h-8 items-center gap-2 text-sm">
        <Checkbox
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
        />
        {value ? "true" : "false"}
      </label>
    );
  }

  if (kind === "number") {
    return (
      <Input
        className="h-8 text-xs"
        type="number"
        value={String(value)}
        onChange={(e) =>
          onChange(e.target.value === "" ? null : Number(e.target.value))
        }
      />
    );
  }

  if (kind === "object") {
    const text =
      typeof value === "string" ? value : JSON.stringify(value, null, 2);
    return (
      <textarea
        className="border-iris bg-background text-text min-h-[72px] w-full border-2 p-2 font-mono text-xs"
        value={text}
        onChange={(e) => {
          try {
            onChange(JSON.parse(e.target.value));
          } catch {
            onChange(e.target.value);
          }
        }}
      />
    );
  }

  return (
    <Input
      className="h-8 text-xs"
      value={value === null || value === undefined ? "" : String(value)}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
