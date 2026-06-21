import * as schema from "@/db/schema.db";
import { broadcast } from "../websocket.utils";
import { ADMIN_BLOB_FIELDS, ADMIN_JSON_FIELDS } from "./schema.admin";
import { eq } from "drizzle-orm";
import type { Db } from "@/types/server";

const BROADCAST_TABLES = new Set([
  "users",
  "games",
  "presets",
  "items",
  "inventory",
  "market",
  "activity",
  "chats",
  "rules",
  "ads",
  "drawings",
  "cells",
  "hangman",
  "pets",
  "inventoryLog",
  "quests",
]);

function isBlobPlaceholder(val: unknown): boolean {
  return typeof val === "string" && val.includes("[buffer");
}

export function maybeBroadcast(table: string, action: string, id: string) {
  if (BROADCAST_TABLES.has(table)) broadcast(table, action, id);
}

export const hasTimestamps = new Set([
  "users",
  "games",
  "presets",
  "items",
  "inventory",
  "market",
  "chats",
  "rules",
  "ads",
  "drawings",
  "cells",
  "hangman",
  "pets",
  "inventoryLog",
  "quests",
]);

const extensionMap: Record<string, string> = {
  ".js": "application/javascript",
  ".css": "text/css",
  ".html": "text/html",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
};

function tryParseJson(value: unknown): unknown {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();

  const isValidJson =
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"));

  if (!isValidJson) return value;

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

export function parseDataUrl(
  value: string,
): { buffer: Buffer; mime: string } | null {
  const match = value.match(/^data:(.+?);base64,(.+)$/);
  if (!match) return null;
  return { mime: match[1], buffer: Buffer.from(match[2], "base64") };
}

export async function cleanBody(
  body: Record<string, unknown>,
  table: string,
): Promise<Record<string, unknown>> {
  const jfSet = new Set(ADMIN_JSON_FIELDS[table] ?? []);
  const bfSet = new Set(ADMIN_BLOB_FIELDS[table] ?? []);

  const out: Record<string, unknown> = {};
  let plainPassword: string | undefined;

  for (const [key, value] of Object.entries(body)) {
    if (key === "password") {
      if (typeof value === "string" && value.trim())
        plainPassword = value.trim();
      continue;
    }
    if ((key === "id" || key === "passwordHash") && !value) continue;
    if (key === "collectionId" || key === "collectionName") continue;

    if (jfSet.has(key)) out[key] = tryParseJson(value);
    else out[key] = value;
  }

  if (table === "users" && plainPassword) {
    out.passwordHash = await Bun.password.hash(plainPassword);
  }

  for (const { field, mimeField } of bfSet) {
    const val = out[field];
    if (typeof val === "string" && val.startsWith("data:")) {
      const parsed = parseDataUrl(val);
      if (parsed) {
        out[field] = parsed.buffer;
        out[mimeField] = parsed.mime;
      }
    } else if (typeof val === "string" && val === "") {
      delete out[field];
      delete out[mimeField];
    } else if (isBlobPlaceholder(val)) {
      delete out[field];
      delete out[mimeField];
    }
  }
  return out;
}

export function sanitizePath(p: string): string {
  return p
    .replace(/\.\.\//g, "")
    .replace(/\.\.\\/g, "")
    .replaceAll("\0", "");
}

export function mimeType(fp: string): string {
  const extension = fp.slice(fp.lastIndexOf(".")).toLowerCase();

  if (extensionMap[extension]) return extensionMap[extension];
  else return "application/octet-stream";
}

export function replaceBuffers(row: Record<string, unknown>): void {
  for (const [k, v] of Object.entries(row)) {
    if (Buffer.isBuffer(v)) {
      (row as Record<string, string>)[k] = `[buffer ${v.length}b]`;
    }
  }
}

export async function verifyAdmin(
  headers: Record<string, string | undefined>,
  adminJwt: { verify(jwt?: string): Promise<false | Record<string, unknown>> },
  db: Db,
): Promise<{ id: string; username: string } | null> {
  const h = headers.authorization;
  const token = h?.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return null;
  const p = await adminJwt.verify(token);
  if (!p || typeof p.sub !== "string") return null;
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, p.sub));
  if (!user || !user.isAdmin) return null;
  return { id: user.id, username: user.username };
}
