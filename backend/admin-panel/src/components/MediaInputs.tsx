import { useCallback } from "react";
import { useInput, useRecordContext, useResourceContext } from "react-admin";
import type { InputProps } from "react-admin";

export function isBlobPlaceholder(val: unknown): boolean {
  return typeof val === "string" && val.includes("[buffer");
}

function fileUrl(resource: string, id: string, field: string) {
  return `/files/${resource}/${id}/${field}`;
}

export function BlobField({ source }: { source: string }) {
  const record = useRecordContext();
  const resource = useResourceContext();
  if (!record?.id) return <span>—</span>;

  const val = record[source];
  if (val === null || val === undefined || val === "") {
    return <span>—</span>;
  }

  const url = fileUrl(String(resource), String(record.id), source);
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" title="Open image">
      <img
        src={url}
        alt=""
        style={{
          width: 40,
          height: 40,
          objectFit: "cover",
          borderRadius: 4,
          border: "1px solid #e2e8f0",
        }}
        onError={(e) => {
          const el = e.target as HTMLImageElement;
          el.style.display = "none";
          const parent = el.parentElement;
          if (parent && !parent.querySelector("[data-fallback]")) {
            const span = document.createElement("span");
            span.dataset.fallback = "1";
            span.textContent = isBlobPlaceholder(val) ? "—" : "нет";
            span.style.fontSize = "11px";
            span.style.color = "#94a3b8";
            parent.appendChild(span);
          }
        }}
      />
    </a>
  );
}

export function BlobInput(props: InputProps & { source: string; label?: string }) {
  const { field, fieldState } = useInput(props);
  const record = useRecordContext();
  const resource = useResourceContext();
  const currentUrl = record?.id
    ? `/files/${resource}/${record.id}/${props.source}`
    : null;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => field.onChange(reader.result);
      reader.readAsDataURL(file);
    },
    [field],
  );

  const hasDataUrl =
    typeof field.value === "string" && field.value.startsWith("data:");
  const previewSrc = hasDataUrl
    ? field.value
    : currentUrl &&
        (isBlobPlaceholder(field.value) ||
          field.value == null ||
          field.value === "")
      ? currentUrl
      : null;

  return (
    <div style={{ marginBottom: 16 }}>
      <label
        style={{
          display: "block",
          marginBottom: 6,
          fontSize: 13,
          color: "#374151",
          fontWeight: 500,
        }}
      >
        {props.label ?? props.source}
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {previewSrc ? (
          <img
            src={previewSrc}
            alt=""
            style={{
              width: 64,
              height: 64,
              objectFit: "cover",
              borderRadius: 6,
              border: "1px solid #e2e8f0",
            }}
          />
        ) : (
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 6,
              border: "1px dashed #d1d5db",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              color: "#9ca3af",
            }}
          >
            Нет файла
          </div>
        )}
        <input type="file" accept="image/*" onChange={handleChange} />
      </div>
      {fieldState.error && (
        <p style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>
          {fieldState.error.message}
        </p>
      )}
    </div>
  );
}

export function AudioField({ source }: { source: string }) {
  const record = useRecordContext();
  const resource = useResourceContext();
  if (!record?.id) return <span>—</span>;

  const val = record[source];
  if (val === null || val === undefined || val === "") {
    return <span>—</span>;
  }

  const url = fileUrl(String(resource), String(record.id), source);
  return (
    <audio
      controls
      src={url}
      preload="metadata"
      style={{ maxWidth: 280, height: 32 }}
    />
  );
}

export function AudioInput(props: InputProps & { source: string; label?: string }) {
  const { field, fieldState } = useInput(props);
  const record = useRecordContext();
  const resource = useResourceContext();
  const currentUrl =
    record?.id && resource
      ? fileUrl(String(resource), String(record.id), props.source)
      : null;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => field.onChange(reader.result);
      reader.readAsDataURL(file);
    },
    [field],
  );

  const hasDataUrl =
    typeof field.value === "string" && field.value.startsWith("data:");
  const previewUrl = hasDataUrl
    ? field.value
    : currentUrl &&
        (isBlobPlaceholder(field.value) ||
          (field.value !== null &&
            field.value !== undefined &&
            field.value !== ""))
      ? currentUrl
      : null;

  return (
    <div style={{ marginBottom: 16 }}>
      <label
        style={{
          display: "block",
          marginBottom: 6,
          fontSize: 13,
          color: "#374151",
          fontWeight: 500,
        }}
      >
        {props.label ?? props.source}
      </label>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {previewUrl ? (
          <audio controls src={previewUrl} style={{ maxWidth: "100%" }} />
        ) : (
          <span style={{ fontSize: 12, color: "#94a3b8" }}>Нет аудио</span>
        )}
        <input type="file" accept="audio/*" onChange={handleChange} />
      </div>
      {fieldState.error && (
        <p style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>
          {fieldState.error.message}
        </p>
      )}
    </div>
  );
}
