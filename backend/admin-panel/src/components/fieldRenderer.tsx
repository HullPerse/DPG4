import {
  BooleanField,
  BooleanInput,
  DateField,
  DateTimeInput,
  NumberField,
  NumberInput,
  TextField,
  TextInput,
  useRecordContext,
} from "react-admin";
import type { AdminFieldMeta } from "../types";
import { JsonField } from "./JsonField";
import { JsonInput } from "./JsonInput";
import { ObjectListInput } from "./ObjectListInput";
import { AudioField, AudioInput, BlobField, BlobInput, isBlobPlaceholder } from "./MediaInputs";
function isObjectArray(value: unknown): boolean {
  if (!Array.isArray(value) || value.length === 0) return false;
  return typeof value[0] === "object" && value[0] !== null && !Array.isArray(value[0]);
}

export function renderField(field: AdminFieldMeta) {
  if (field.type === "hidden") return null;
  if (field.type === "blob") return <BlobField source={field.source} key={field.source} />;
  if (field.type === "audio") return <AudioField source={field.source} key={field.source} />;
  if (field.type === "boolean")
    return <BooleanField source={field.source} key={field.source} />;
  if (field.type === "number")
    return <NumberField source={field.source} key={field.source} />;
  if (field.type === "date")
    return (
      <DateField source={field.source} key={field.source} showTime />
    );
  if (field.type === "json" || field.type === "objectList") {
    return <JsonField source={field.source} key={field.source} maxChars={320} />;
  }
  return <ObjectAwareTextField source={field.source} key={field.source} />;
}

function ObjectAwareTextField({ source }: { source: string }) {
  const record = useRecordContext();
  const val = record?.[source];
  if (source === "audio") {
    return <AudioField source={source} />;
  }
  if (typeof val === "string" && (isBlobPlaceholder(val) || val.startsWith("data:"))) {
    return <BlobField source={source} />;
  }
  if (val !== null && val !== undefined && typeof val === "object") {
    return <JsonField source={source} maxChars={320} />;
  }
  return <TextField source={source} />;
}

export function SmartInput({
  field,
  record,
}: {
  field: AdminFieldMeta;
  record?: Record<string, unknown>;
}) {
  if (field.type === "hidden") return null;
  if (field.type === "boolean")
    return <BooleanInput source={field.source} key={field.source} />;
  if (field.type === "number")
    return (
      <NumberInput source={field.source} key={field.source} fullWidth />
    );
  if (field.type === "date")
    return <DateTimeInput source={field.source} key={field.source} />;
  if (field.type === "blob")
    return <BlobInput source={field.source} key={field.source} />;
  if (field.type === "audio")
    return <AudioInput source={field.source} key={field.source} />;
  if (field.type === "objectList") {
    return (
      <ObjectListInput
        source={field.source}
        fieldMeta={field}
        key={field.source}
      />
    );
  }

  const val = record?.[field.source];
  if (
    field.type === "json" ||
    isObjectArray(val) ||
    (val !== null && val !== undefined && typeof val === "object" && !Array.isArray(val))
  ) {
    if (isObjectArray(val)) {
      return (
        <ObjectListInput
          source={field.source}
          fieldMeta={field}
          key={field.source}
        />
      );
    }
    return <JsonInput source={field.source} key={field.source} />;
  }

  return (
    <TextInput source={field.source} key={field.source} fullWidth />
  );
}

export function ObjectListPreview({ source }: { source: string }) {
  const record = useRecordContext();
  const val = record?.[source];
  if (!isObjectArray(val)) return <JsonField source={source} />;
  const arr = val as Record<string, unknown>[];
  if (!arr.length) return <span>—</span>;
  const cols = Object.keys(arr[0]!).slice(0, 4);
  return (
    <span style={{ fontSize: 12 }}>
      {arr.length} items ({cols.join(", ")})
    </span>
  );
}
