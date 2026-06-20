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

const hasTimestamps = new Set([
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

function tryParseJson(v: unknown): unknown {
  if (typeof v !== "string") return v;
  const trimmed = v.trim();
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return v;
    }
  }
  return v;
}

function parseDataUrl(value: string): { buffer: Buffer; mime: string } | null {
  const match = value.match(/^data:(.+?);base64,(.+)$/);
  if (!match) return null;
  return { mime: match[1], buffer: Buffer.from(match[2], "base64") };
}

export async function cleanBody(
  body: Record<string, unknown>,
  tbl: string,
): Promise<Record<string, unknown>> {
  const jf = ADMIN_JSON_FIELDS[tbl] ?? [];
  const bf = ADMIN_BLOB_FIELDS[tbl] ?? [];
  const out: Record<string, unknown> = {};
  let plainPassword: string | undefined;

  for (const [k, v] of Object.entries(body)) {
    if (k === "password") {
      if (typeof v === "string" && v.trim()) plainPassword = v.trim();
      continue;
    }
    if ((k === "id" || k === "passwordHash") && !v) continue;
    if (k === "collectionId" || k === "collectionName") continue;
    out[k] = jf.includes(k) ? tryParseJson(v) : v;
  }

  if (tbl === "users" && plainPassword) {
    out.passwordHash = await Bun.password.hash(plainPassword);
  }

  for (const { field, mimeField } of bf) {
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
  if (fp.endsWith(".js")) return "application/javascript";
  if (fp.endsWith(".css")) return "text/css";
  if (fp.endsWith(".html")) return "text/html";
  if (fp.endsWith(".json")) return "application/json";
  if (fp.endsWith(".svg")) return "image/svg+xml";
  if (fp.endsWith(".png")) return "image/png";
  if (fp.endsWith(".jpg") || fp.endsWith(".jpeg")) return "image/jpeg";
  if (fp.endsWith(".webp")) return "image/webp";
  if (fp.endsWith(".ico")) return "image/x-icon";
  if (fp.endsWith(".woff2")) return "font/woff2";
  if (fp.endsWith(".woff")) return "font/woff";
  if (fp.endsWith(".ttf")) return "font/ttf";
  return "application/octet-stream";
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
