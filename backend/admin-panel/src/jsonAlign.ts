export function normalizeJsonValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return value;
      }
    }
    return value;
  }
  return value;
}

function formatPrimitive(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  return JSON.stringify(value);
}

/** Objects/arrays as lines with keys (or indices) aligned before ":" */
export function formatAlignedJson(value: unknown, depth = 0): string[] {
  const indent = "  ".repeat(depth);

  if (value === null || typeof value !== "object") {
    return [`${indent}${formatPrimitive(value)}`];
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return [`${indent}[]`];
    const indexWidth = String(value.length - 1).length;
    const lines: string[] = [];
    for (let i = 0; i < value.length; i++) {
      const item = value[i];
      const label = String(i).padStart(indexWidth);
      if (item !== null && typeof item === "object") {
        const empty = Array.isArray(item)
          ? item.length === 0
          : Object.keys(item as object).length === 0;
        if (empty) {
          lines.push(
            `${indent}${label}:  ${Array.isArray(item) ? "[]" : "{}"}`,
          );
        } else {
          lines.push(`${indent}${label}:`);
          lines.push(...formatAlignedJson(item, depth + 1));
        }
      } else {
        lines.push(`${indent}${label}:  ${formatPrimitive(item)}`);
      }
    }
    return lines;
  }

  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) return [`${indent}{}`];

  const maxKeyLen = Math.max(...entries.map(([key]) => key.length));
  const lines: string[] = [];

  for (const [key, val] of entries) {
    const column = key.padEnd(maxKeyLen);
    if (val !== null && typeof val === "object") {
      const empty = Array.isArray(val)
        ? val.length === 0
        : Object.keys(val as object).length === 0;
      if (empty) {
        lines.push(
          `${indent}${column}:  ${Array.isArray(val) ? "[]" : "{}"}`,
        );
      } else {
        lines.push(`${indent}${column}:`);
        lines.push(...formatAlignedJson(val, depth + 1));
      }
    } else {
      lines.push(`${indent}${column}:  ${formatPrimitive(val)}`);
    }
  }

  return lines;
}

export function formatAlignedJsonText(value: unknown): string {
  const normalized = normalizeJsonValue(value);
  if (normalized === null || typeof normalized !== "object") {
    return normalized === null ? "" : formatPrimitive(normalized);
  }
  return formatAlignedJson(normalized, 0).join("\n");
}

type ParsedLine = { depth: number; key: string; rest: string };

function parseAlignedLines(text: string): ParsedLine[] {
  const result: ParsedLine[] = [];
  for (const raw of text.split("\n")) {
    if (!raw.trim()) continue;
    const depth = raw.search(/\S/);
    const content = raw.slice(depth).trimEnd();
    const colon = content.indexOf(":");
    if (colon === -1) continue;
    const key = content.slice(0, colon).trim();
    const rest = content.slice(colon + 1).trim();
    result.push({ depth, key, rest });
  }
  return result;
}

function parseBlock(
  lines: ParsedLine[],
  start: number,
  depth: number,
): [unknown, number] {
  if (start >= lines.length || lines[start].depth < depth) {
    return [null, start];
  }

  const first = lines[start];
  const isArray = /^\d+$/.test(first.key);

  if (isArray) {
    const items: unknown[] = [];
    let i = start;
    while (i < lines.length && lines[i].depth === depth) {
      const line = lines[i];
      if (!line.rest) {
        const [nested, next] = parseBlock(lines, i + 1, depth + 1);
        items.push(nested ?? {});
        i = next;
      } else if (line.rest === "[]") {
        items.push([]);
        i++;
      } else if (line.rest === "{}") {
        items.push({});
        i++;
      } else {
        items.push(parseScalar(line.rest));
        i++;
      }
    }
    return [items, i];
  }

  const obj: Record<string, unknown> = {};
  let i = start;
  while (i < lines.length && lines[i].depth === depth) {
    const line = lines[i];
    if (!line.rest) {
      const [nested, next] = parseBlock(lines, i + 1, depth + 1);
      obj[line.key] = nested ?? {};
      i = next;
    } else if (line.rest === "[]") {
      obj[line.key] = [];
      i++;
    } else if (line.rest === "{}") {
      obj[line.key] = {};
      i++;
    } else {
      obj[line.key] = parseScalar(line.rest);
      i++;
    }
  }
  return [obj, i];
}

function parseScalar(text: string): unknown {
  if (text === "null") return null;
  if (text === "true") return true;
  if (text === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function parseJsonOrAligned(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    /* aligned key: value */
  }

  const lines = parseAlignedLines(trimmed);
  if (lines.length === 0) return trimmed;

  const [value] = parseBlock(lines, 0, lines[0].depth);
  return value;
}

/** Returns error message or null if valid */
export function validateJsonText(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      JSON.parse(trimmed);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Невалидный JSON";
    }
  }

  try {
    parseJsonOrAligned(trimmed);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "Невалидный формат";
  }
}
