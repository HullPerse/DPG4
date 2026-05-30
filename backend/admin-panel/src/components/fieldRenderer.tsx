import { JsonField } from "@/components/JsonField";
import { JsonInput } from "@/components/JsonInput";
import {
  FieldSection,
  isFieldChanged,
  ValueChip,
} from "@/components/FieldSection";
import {
  AudioField,
  AudioInput,
  BlobField,
  BlobInput,
  isBlobPlaceholder,
} from "@/components/MediaInputs";
import { ObjectListInput } from "@/components/ObjectListInput";
import { ReferenceSelect } from "@/components/ReferenceSelect";
import { StringListInput, StringListPreview } from "@/components/StringListInput";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { isObjectArray, isStringArray } from "@/lib/arrayFieldUtils";
import type { AdminFieldMeta } from "@/types";

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "да" : "нет";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function findChoiceLabel(field: AdminFieldMeta, value: unknown): string | undefined {
  const v = value === null || value === undefined ? "" : String(value);
  return field.choices?.find((c) => c.value === v)?.label ?? v;
}

export function renderListCell(
  field: AdminFieldMeta,
  record: Record<string, unknown>,
  resource: string,
) {
  const val = record[field.source];
  if (field.type === "blob") {
    return <BlobField source={field.source} record={record} resource={resource} />;
  }
  if (field.type === "audio") {
    return <AudioField source={field.source} record={record} resource={resource} />;
  }
  if (field.type === "stringList" || isStringArray(val)) {
    return <StringListPreview value={val} />;
  }
  if (field.type === "objectList" || isObjectArray(val)) {
    return <ObjectListPreview value={val} />;
  }
  if (field.type === "json") {
    return <JsonField value={val} maxChars={120} />;
  }
  if (field.type === "select" || field.choices?.length) {
    const label = findChoiceLabel(field, val);
    return val ? <ValueChip value={String(val)} label={label} /> : <span className="text-muted">—</span>;
  }
  if (typeof val === "string" && (isBlobPlaceholder(val) || val.startsWith("data:"))) {
    return <BlobField source={field.source} record={record} resource={resource} />;
  }
  if (val !== null && val !== undefined && typeof val === "object") {
    return <JsonField value={val} maxChars={120} />;
  }
  return <span className="max-w-[200px] truncate">{formatCell(val)}</span>;
}

export function renderShowField(
  field: AdminFieldMeta,
  record: Record<string, unknown>,
  resource: string,
) {
  const val = record[field.source];
  if (field.type === "password" || field.type === "hidden") return null;

  return (
    <div
      key={field.source}
      className="border-highlight-high border-b py-3 last:border-0"
    >
      <div className="text-muted mb-1 flex items-center gap-2 text-xs font-bold uppercase">
        {field.source}
        {field.type === "json" && (
          <span className="bg-iris/20 text-iris px-1 text-[10px]">json</span>
        )}
        {field.type === "objectList" && (
          <span className="bg-primary/20 text-primary px-1 text-[10px]">list</span>
        )}
        {field.type === "stringList" && (
          <span className="bg-primary/20 text-primary px-1 text-[10px]">strings</span>
        )}
        {(field.type === "select" || field.choices?.length) && (
          <span className="bg-iris/20 text-iris px-1 text-[10px]">select</span>
        )}
      </div>
      <div>
        {field.type === "blob" ? (
          <BlobField source={field.source} record={record} resource={resource} />
        ) : field.type === "audio" ? (
          <AudioField source={field.source} record={record} resource={resource} />
        ) : field.type === "stringList" || isStringArray(val) ? (
          <StringListPreview value={val} />
        ) : field.type === "json" || field.type === "objectList" ? (
          <JsonField value={val} />
        ) : field.type === "select" || field.choices?.length ? (
          val ? (
            <ValueChip
              value={String(val)}
              label={findChoiceLabel(field, val)}
            />
          ) : (
            <span className="text-muted">—</span>
          )
        ) : typeof val === "string" &&
          (isBlobPlaceholder(val) || val.startsWith("data:")) ? (
          <BlobField source={field.source} record={record} resource={resource} />
        ) : val !== null && val !== undefined && typeof val === "object" ? (
          <JsonField value={val} />
        ) : (
          <span>{formatCell(val)}</span>
        )}
      </div>
    </div>
  );
}

function SimpleFieldWrap({
  field,
  changed,
  children,
  badge,
}: {
  field: AdminFieldMeta;
  changed?: boolean;
  children: React.ReactNode;
  badge?: string;
}) {
  return (
    <FieldSection
      title={field.source}
      variant={field.reference ? "select" : "default"}
      changed={changed}
      badge={badge}
      className="p-3"
    >
      {children}
    </FieldSection>
  );
}

export function SmartInput({
  field,
  record,
  resource,
  values,
  onChange,
  isCreate,
}: {
  field: AdminFieldMeta;
  record?: Record<string, unknown>;
  resource: string;
  values: Record<string, unknown>;
  onChange: (source: string, value: unknown) => void;
  isCreate?: boolean;
}) {
  const set = (v: unknown) => onChange(field.source, v);
  const val = values[field.source];
  const changed = !isCreate && isFieldChanged(val, record?.[field.source]);

  if (field.type === "hidden") return null;

  if (field.type === "password") {
    return (
      <FieldSection
        title="Пароль"
        changed={changed}
        hint={
          isCreate
            ? "Обязателен для нового пользователя"
            : "Оставьте пустым, чтобы не менять текущий пароль"
        }
      >
        <Input
          id={field.source}
          type="password"
          value={String(val ?? "")}
          onChange={(e) => set(e.target.value)}
          autoComplete="new-password"
        />
      </FieldSection>
    );
  }

  if (field.type === "boolean") {
    return (
      <FieldSection title={field.source} changed={changed} badge="bool" className="p-3">
        <label className="flex cursor-pointer items-center gap-3">
          <Checkbox
            id={field.source}
            checked={!!val}
            onChange={(e) => set(e.target.checked)}
          />
          <span className="text-sm font-medium">{val ? "Включено" : "Выключено"}</span>
        </label>
      </FieldSection>
    );
  }

  if (field.type === "select" || (field.choices && field.choices.length > 0)) {
    const choices = field.choices ?? [];
    return (
      <FieldSection
        title={field.source}
        variant="select"
        changed={changed}
        badge="select"
        className="p-3"
      >
        <Select
          value={val === undefined || val === null ? "" : String(val)}
          onChange={(v) => set(v)}
          options={choices}
        />
      </FieldSection>
    );
  }

  if (field.reference) {
    return (
      <FieldSection
        title={field.source}
        variant="select"
        changed={changed}
        badge={`→ ${field.reference.table}`}
        className="p-3"
      >
        <ReferenceSelect field={field} value={val} onChange={(v) => set(v)} />
      </FieldSection>
    );
  }

  if (field.type === "number") {
    return (
      <SimpleFieldWrap field={field} changed={changed} badge="number">
        <Input
          id={field.source}
          type="number"
          value={val === undefined || val === null ? "" : String(val)}
          onChange={(e) =>
            set(e.target.value === "" ? null : Number(e.target.value))
          }
        />
      </SimpleFieldWrap>
    );
  }

  if (field.type === "date") {
    return (
      <SimpleFieldWrap field={field} changed={changed}>
        <Input
          id={field.source}
          type="datetime-local"
          value={val ? String(val).slice(0, 16) : ""}
          onChange={(e) =>
            set(e.target.value ? new Date(e.target.value).toISOString() : null)
          }
        />
      </SimpleFieldWrap>
    );
  }

  if (field.type === "blob") {
    return (
      <FieldSection title={field.source} variant="media" changed={changed} badge="image">
        <BlobInput
          source={field.source}
          value={val}
          onChange={set}
          record={record}
          resource={resource}
        />
      </FieldSection>
    );
  }

  if (field.type === "audio") {
    return (
      <FieldSection title={field.source} variant="media" changed={changed} badge="audio">
        <AudioInput
          source={field.source}
          value={val}
          onChange={set}
          record={record}
          resource={resource}
        />
      </FieldSection>
    );
  }

  if (field.type === "stringList") {
    return (
      <StringListInput
        source={field.source}
        value={val}
        onChange={set}
        changed={changed}
      />
    );
  }

  if (field.type === "objectList") {
    return (
      <ObjectListInput
        source={field.source}
        fieldMeta={field}
        value={val}
        onChange={set}
        changed={changed}
      />
    );
  }

  const recordVal = record?.[field.source];
  if (
    field.type === "json" ||
    isStringArray(val ?? recordVal) ||
    isObjectArray(val ?? recordVal) ||
    (val !== null &&
      val !== undefined &&
      typeof val === "object" &&
      !Array.isArray(val))
  ) {
    if (isStringArray(val ?? recordVal)) {
      return (
        <StringListInput
          source={field.source}
          value={val ?? recordVal}
          onChange={set}
          changed={changed}
        />
      );
    }
    if (isObjectArray(val ?? recordVal)) {
      return (
        <ObjectListInput
          source={field.source}
          fieldMeta={field}
          value={val ?? recordVal}
          onChange={set}
          changed={changed}
        />
      );
    }
    return (
      <JsonInput
        source={field.source}
        value={val}
        onChange={set}
        changed={changed}
      />
    );
  }

  return (
    <SimpleFieldWrap field={field} changed={changed}>
      <Input
        id={field.source}
        value={val === undefined || val === null ? "" : String(val)}
        onChange={(e) => set(e.target.value)}
      />
    </SimpleFieldWrap>
  );
}
export function ObjectListPreview({ value }: { value: unknown }) {
  if (!isObjectArray(value)) return <JsonField value={value} maxChars={80} />;
  const arr = value as Record<string, unknown>[];
  if (!arr.length) return <span className="text-muted">—</span>;
  const cols = Object.keys(arr[0]!).slice(0, 4);
  return (
    <span className="bg-primary/10 text-primary border-primary/30 inline-flex items-center gap-1 border px-1.5 py-0.5 text-xs font-bold">
      {arr.length} · {cols.join(", ")}
    </span>
  );
}

