import { Braces, Code } from "lucide-react";
import { useEffect, useState } from "react";
import { JsonObjectEditor } from "@/components/JsonObjectEditor";
import { FieldSection } from "@/components/FieldSection";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  formatAlignedJsonText,
  parseJsonOrAligned,
  validateJsonText,
} from "@/jsonAlign";

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

export function JsonInput({
  source,
  label,
  value,
  onChange,
  changed,
}: {
  source: string;
  label?: string;
  value: unknown;
  onChange: (v: unknown) => void;
  changed?: boolean;
}) {
  const canVisual = isPlainObject(value) || value === null || value === undefined;
  const [mode, setMode] = useState<"visual" | "raw">(
    canVisual && isPlainObject(value) ? "visual" : "raw",
  );
  const [text, setText] = useState(() => formatAlignedJsonText(value));
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => {
    setText(formatAlignedJsonText(value));
    setParseError(null);
    if (!isPlainObject(value) && Array.isArray(value)) setMode("raw");
  }, [value]);

  const objectValue: Record<string, unknown> = isPlainObject(value)
    ? value
    : value === null || value === undefined
      ? {}
      : {};

  return (
    <FieldSection
      title={label ?? source}
      variant="json"
      changed={changed}
      badge="JSON"
      hint={
        canVisual && !Array.isArray(value)
          ? "Визуальный режим для объекта или сырой JSON для массивов и сложных значений."
          : "Редактор JSON. Клик вне поля — выравнивание ключей."
      }
    >
      {canVisual && !Array.isArray(value) && (
        <div className="mb-3 flex gap-1">
          <Button
            type="button"
            size="sm"
            variant={mode === "visual" ? "primary" : "outline"}
            onClick={() => setMode("visual")}
          >
            <Braces className="size-4" />
            Поля
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "raw" ? "primary" : "outline"}
            onClick={() => setMode("raw")}
          >
            <Code className="size-4" />
            JSON
          </Button>
        </div>
      )}

      {mode === "visual" && canVisual && !Array.isArray(value) ? (
        <JsonObjectEditor
          value={objectValue}
          onChange={(v) => onChange(v)}
        />
      ) : (
        <>
          <Textarea
            id={source}
            rows={12}
            value={text}
            onChange={(e) => {
              const next = e.target.value;
              setText(next);
              const err = validateJsonText(next);
              setParseError(err);
              if (!err) onChange(parseJsonOrAligned(next));
            }}
            onBlur={() => {
              const err = validateJsonText(text);
              setParseError(err);
              if (!err) {
                onChange(parseJsonOrAligned(text));
                setText(formatAlignedJsonText(value));
              }
            }}
            className={parseError ? "border-love" : undefined}
          />
          <p className="text-muted mt-2 text-xs">
            {parseError ?? "Валидный JSON сохраняется автоматически."}
          </p>
        </>
      )}
    </FieldSection>
  );
}
