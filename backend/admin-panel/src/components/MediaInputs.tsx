import { useCallback } from "react";
import { Label } from "@/components/ui/label";

export function isBlobPlaceholder(val: unknown): boolean {
  return typeof val === "string" && val.includes("[buffer");
}

function fileUrl(resource: string, id: string, field: string) {
  return `/files/${resource}/${id}/${field}`;
}

export function BlobField({
  source,
  record,
  resource,
}: {
  source: string;
  record: Record<string, unknown>;
  resource: string;
}) {
  if (!record.id) return <span className="text-muted">—</span>;

  const val = record[source];
  if (val === null || val === undefined || val === "") {
    return <span className="text-muted">—</span>;
  }

  const url = fileUrl(resource, String(record.id), source);
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" title="Open image">
      <img
        src={url}
        alt=""
        className="border-highlight-high size-10 border-2 object-cover"
        onError={(e) => {
          const el = e.target as HTMLImageElement;
          el.style.display = "none";
          const parent = el.parentElement;
          if (parent && !parent.querySelector("[data-fallback]")) {
            const span = document.createElement("span");
            span.dataset.fallback = "1";
            span.textContent = isBlobPlaceholder(val) ? "—" : "нет";
            span.className = "text-muted text-xs";
            parent.appendChild(span);
          }
        }}
      />
    </a>
  );
}

export function BlobInput({
  source,
  label,
  value,
  onChange,
  record,
  resource,
}: {
  source: string;
  label?: string;
  value: unknown;
  onChange: (v: string | null) => void;
  record?: Record<string, unknown>;
  resource: string;
}) {
  const currentUrl = record?.id
    ? `/files/${resource}/${record.id}/${source}`
    : null;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => onChange(reader.result as string);
      reader.readAsDataURL(file);
    },
    [onChange],
  );

  const hasDataUrl = typeof value === "string" && value.startsWith("data:");
  const previewSrc = hasDataUrl
    ? value
    : currentUrl &&
        (isBlobPlaceholder(value) || value == null || value === "")
      ? currentUrl
      : null;

  return (
    <div className="mb-4">
      <Label>{label ?? source}</Label>
      <div className="flex items-center gap-3">
        {previewSrc ? (
          <img
            src={previewSrc}
            alt=""
            className="border-highlight-high size-16 border-2 object-cover"
          />
        ) : (
          <div className="border-highlight-high text-muted flex size-16 items-center justify-center border-2 border-dashed text-xs">
            Нет файла
          </div>
        )}
        <input type="file" accept="image/*" onChange={handleChange} className="text-sm" />
      </div>
    </div>
  );
}

export function AudioField({
  source,
  record,
  resource,
}: {
  source: string;
  record: Record<string, unknown>;
  resource: string;
}) {
  if (!record.id) return <span className="text-muted">—</span>;

  const val = record[source];
  if (val === null || val === undefined || val === "") {
    return <span className="text-muted">—</span>;
  }

  const url = fileUrl(resource, String(record.id), source);
  return (
    <audio controls src={url} preload="metadata" className="max-w-[280px] h-8" />
  );
}

export function AudioInput({
  source,
  label,
  value,
  onChange,
  record,
  resource,
}: {
  source: string;
  label?: string;
  value: unknown;
  onChange: (v: string | null) => void;
  record?: Record<string, unknown>;
  resource: string;
}) {
  const currentUrl =
    record?.id && resource
      ? fileUrl(resource, String(record.id), source)
      : null;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => onChange(reader.result as string);
      reader.readAsDataURL(file);
    },
    [onChange],
  );

  const hasDataUrl = typeof value === "string" && value.startsWith("data:");
  const previewUrl = hasDataUrl
    ? value
    : currentUrl &&
        (isBlobPlaceholder(value) ||
          (value !== null && value !== undefined && value !== ""))
      ? currentUrl
      : null;

  return (
    <div className="mb-4">
      <Label>{label ?? source}</Label>
      <div className="flex flex-col gap-2">
        {previewUrl ? (
          <audio controls src={previewUrl} className="max-w-full" />
        ) : (
          <span className="text-muted text-xs">Нет аудио</span>
        )}
        <input type="file" accept="audio/*" onChange={handleChange} className="text-sm" />
      </div>
    </div>
  );
}
