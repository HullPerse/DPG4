import { Copy, GripVertical, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { FieldSection } from "@/components/FieldSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeStringList } from "@/lib/arrayFieldUtils";

export function StringListInput({
  source,
  value,
  onChange,
  changed,
  placeholder = "Значение",
}: {
  source: string;
  value: unknown;
  onChange: (v: string[]) => void;
  changed?: boolean;
  placeholder?: string;
}) {
  const items = useMemo(() => normalizeStringList(value), [value]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const commit = (next: string[]) => onChange(next);

  const updateItem = (index: number, text: string) => {
    commit(items.map((item, i) => (i === index ? text : item)));
  };

  const addItem = () => commit([...items, ""]);

  const duplicateItem = (index: number) => {
    const next = [...items];
    next.splice(index + 1, 0, items[index] ?? "");
    commit(next);
  };

  const removeItem = (index: number) =>
    commit(items.filter((_, i) => i !== index));

  const onDrop = (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) return;
    const next = [...items];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved ?? "");
    commit(next);
    setDragIndex(null);
  };

  return (
    <FieldSection
      title={source}
      variant="list"
      changed={changed}
      badge={`строки · ${items.length}`}
      hint="Список строк. Перетащите за ⋮⋮ для смены порядка."
    >
      {items.length === 0 ? (
        <p className="text-muted border-highlight-high mb-3 border-2 border-dashed p-6 text-center text-sm">
          Нет элементов — добавьте первую строку
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item, index) => (
            <div
              key={index}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(index)}
              className="border-highlight-high flex items-center gap-1 border-2 p-1"
            >
              <span className="text-muted w-6 shrink-0 text-center text-xs font-bold">
                {index + 1}
              </span>
              <GripVertical
                className={`text-muted size-4 shrink-0 cursor-grab ${dragIndex === index ? "text-primary" : ""}`}
              />
              <Input
                className="min-w-0 flex-1"
                value={item}
                placeholder={placeholder}
                onChange={(e) => updateItem(index, e.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title="Дублировать"
                onClick={() => duplicateItem(index)}
              >
                <Copy className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title="Удалить"
                onClick={() => removeItem(index)}
              >
                <Trash2 className="text-love size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <Button type="button" variant="outline" size="sm" className="mt-3" onClick={addItem}>
        <Plus />
        Добавить строку
      </Button>
    </FieldSection>
  );
}

export function StringListPreview({ value }: { value: unknown }) {
  const items = normalizeStringList(value);
  if (!items.length) return <span className="text-muted">—</span>;
  return (
    <span className="bg-primary/10 text-primary border-primary/30 inline-flex max-w-[240px] flex-wrap items-center gap-1 border px-1.5 py-0.5 text-xs font-bold">
      {items.length} · {items.slice(0, 3).join(", ")}
      {items.length > 3 ? "…" : ""}
    </span>
  );
}
