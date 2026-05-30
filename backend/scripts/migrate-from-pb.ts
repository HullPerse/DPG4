/**
 * Migrate PocketBase to DPG server.
 *
 * bun run scripts/migrate-from-pb.ts
 * PB_DB_PATH=../old backend/pb_data/data.db  (path to data.db)
 * PB_STORAGE=../old backend/pb_data/storage
 */
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { readdirSync, readFileSync, existsSync, statSync } from "fs";
import { join } from "path";
import * as schema from "../src/db/schema";
import { nowIso } from "../src/lib/dates";

const PB_DB =
  process.env.PB_DB_PATH ??
  join(import.meta.dir, "../../old backend/pb_data/data.db");
const PB_STORAGE =
  process.env.PB_STORAGE ??
  join(import.meta.dir, "../../old backend/pb_data/storage");

const COLLECTION_MAP: Record<string, keyof typeof schema> = {
  _pb_users_auth_: "users",
  pbc_879072730: "games",
  pbc_1118224005: "presets",
  pbc_710432678: "items",
  pbc_3573984430: "inventory",
  pbc_1556084869: "market",
  pbc_3963244867: "activity",
  pbc_3861817060: "chats",
  pbc_1121724375: "rules",
  pbc_1911549009: "ads",
  pbc_1706527574: "drawings",
  pbc_2659677491: "cells",
};

const sqlite = new Database("data/db.sqlite");
const db = drizzle(sqlite, { schema });

function readPbFile(
  collectionId: string,
  recordId: string,
  fileName: string,
): Buffer | null {
  if (!fileName || fileName.includes("/")) return null;
  const base = join(PB_STORAGE, collectionId, recordId, fileName);
  if (!existsSync(base) || base.endsWith(".attrs")) return null;
  if (!statSync(base).isFile()) return null;
  return readFileSync(base);
}

function findMainFile(
  collectionId: string,
  recordId: string,
): {
  name: string;
  buffer: Buffer;
} | null {
  const dir = join(PB_STORAGE, collectionId, recordId);
  if (!existsSync(dir)) return null;
  for (const entry of readdirSync(dir)) {
    if (entry.endsWith(".attrs") || entry === "thumbs_*") continue;
    const full = join(dir, entry);
    if (statSync(full).isFile()) {
      return { name: entry, buffer: readFileSync(full) };
    }
    if (statSync(full).isDirectory() && entry.startsWith("thumbs_")) {
      const inner = readdirSync(full).find((f) => !f.endsWith(".attrs"));
      if (inner) {
        return { name: inner, buffer: readFileSync(join(full, inner)) };
      }
    }
  }
  return null;
}

function parseJson<T>(v: unknown, fallback: T): T {
  if (v == null) return fallback;
  if (typeof v === "string") {
    try {
      return JSON.parse(v) as T;
    } catch {
      return fallback;
    }
  }
  return v as T;
}

async function importUsers(pb: Database) {
  const rows = pb.query(`SELECT * FROM users WHERE id != ''`).all() as Record<
    string,
    unknown
  >[];

  for (const row of rows) {
    const id = String(row.id);
    const ts = row.created ?? nowIso();
    await db
      .insert(schema.users)
      .values({
        id,
        username: String(row.username ?? "").toUpperCase(),
        passwordHash: String(row.password ?? ""),
        email: String(row.email ?? ""),
        avatar: String(row.avatar ?? ""),
        color: String(row.color ?? "#000000"),
        isAdmin: Boolean(row.isAdmin),
        position: Number(row.position ?? 0),
        money: Number(row.money ?? 0),
        steam: String(row.steam ?? ""),
        currentAction: String(row.currentAction ?? "MOVE_POSITIVE"),
        currentDice: Number(row.currentDice ?? 1),
        status: parseJson<string[]>(row.status, []),
        place: String(row.place ?? "0"),
        created: String(ts),
        updated: String(row.updated ?? ts),
      })
      .onConflictDoNothing();
  }
  console.log(`users: ${rows.length}`);
}

async function importCollection(
  pb: Database,
  pbTable: string,
  collectionId: string,
) {
  const kind = COLLECTION_MAP[collectionId];
  if (!kind) return;

  let rows: Record<string, unknown>[] = [];
  try {
    rows = pb.query(`SELECT * FROM ${pbTable}`).all() as Record<
      string,
      unknown
    >[];
  } catch {
    console.warn(`Skip ${pbTable} (table missing)`);
    return;
  }

  for (const row of rows) {
    const id = String(row.id);
    const created = String(row.created ?? nowIso());
    const updated = String(row.updated ?? created);

    if (kind === "games") {
      const file = row.image
        ? (readPbFile(collectionId, id, String(row.image)) ??
          findMainFile(collectionId, id)?.buffer)
        : findMainFile(collectionId, id)?.buffer;
      await db
        .insert(schema.games)
        .values({
          id,
          user: parseJson(row.user, {}),
          data: parseJson(row.data, {}),
          status: String(row.status ?? "PLAYING"),
          playtime: parseJson(row.playtime, {}),
          score: Number(row.score ?? 0),
          review: parseJson(row.review, null),
          image: file ?? null,
          imageMime: file ? "image/png" : null,
          created,
          updated,
        })
        .onConflictDoNothing();
    } else if (kind === "items") {
      const file =
        readPbFile(collectionId, id, String(row.image ?? "")) ??
        findMainFile(collectionId, id)?.buffer;
      await db
        .insert(schema.items)
        .values({
          id,
          type: String(row.type ?? "item"),
          label: String(row.label ?? ""),
          description: String(row.description ?? ""),
          charge: Number(row.charge ?? 0),
          rollable: Boolean(row.rollable),
          status: parseJson(row.status, null),
          image: file ?? null,
          imageMime: file ? "image/png" : null,
          created,
          updated,
        })
        .onConflictDoNothing();
    } else if (kind === "inventory" || kind === "market") {
      const file =
        readPbFile(collectionId, id, String(row.image ?? "")) ??
        findMainFile(collectionId, id)?.buffer;
      if (kind === "inventory") {
        await db
          .insert(schema.inventory)
          .values({
            id,
            type: String(row.type ?? "item"),
            owner: String(row.owner ?? ""),
            label: String(row.label ?? ""),
            description: String(row.description ?? ""),
            charge: Number(row.charge ?? 0),
            image: file ?? null,
            imageMime: file ? "image/png" : null,
            created,
            updated,
          })
          .onConflictDoNothing();
      } else {
        await db
          .insert(schema.market)
          .values({
            id,
            type: String(row.type ?? "item"),
            originalId: String(row.originalId ?? ""),
            owner: parseJson(row.owner, {}),
            label: String(row.label ?? ""),
            description: String(row.description ?? ""),
            charge: Number(row.charge ?? 0),
            price: Number(row.price ?? 0),
            discount: row.discount != null ? Number(row.discount) : null,
            image: file ?? null,
            imageMime: file ? "image/png" : null,
            created,
            updated,
          })
          .onConflictDoNothing();
      }
    } else if (kind === "activity") {
      await db
        .insert(schema.activity)
        .values({
          id,
          author: row.author != null ? String(row.author) : null,
          image: row.image != null ? String(row.image) : null,
          type: String(row.type ?? "emoji"),
          text: String(row.text ?? ""),
          created,
        })
        .onConflictDoNothing();
    } else if (kind === "chats") {
      const file =
        readPbFile(collectionId, id, String(row.image ?? "")) ??
        findMainFile(collectionId, id)?.buffer;
      await db
        .insert(schema.chats)
        .values({
          id,
          data: parseJson(row.data, {}),
          message: String(row.message ?? ""),
          image: file ?? null,
          imageMime: file ? "image/png" : null,
          isRead: Boolean(row.isRead),
          created,
        })
        .onConflictDoNothing();
    } else if (kind === "rules") {
      await db
        .insert(schema.rules)
        .values({
          id,
          category: String(row.category ?? ""),
          rule: String(row.rule ?? ""),
          created,
          updated,
        })
        .onConflictDoNothing();
    } else if (kind === "ads") {
      const img =
        row.image != null
          ? readPbFile(collectionId, id, String(row.image))
          : null;
      const aud =
        row.audio != null
          ? readPbFile(collectionId, id, String(row.audio))
          : null;
      await db
        .insert(schema.ads)
        .values({
          id,
          owner: parseJson(row.owner, {}),
          text: String(row.text ?? ""),
          image: img ?? null,
          imageMime: img ? "image/png" : null,
          audio: aud ?? null,
          audioMime: aud ? "audio/mpeg" : null,
          created,
          updated,
        })
        .onConflictDoNothing();
    } else if (kind === "drawings") {
      const file =
        readPbFile(collectionId, id, String(row.image ?? "")) ??
        findMainFile(collectionId, id)?.buffer;
      await db
        .insert(schema.drawings)
        .values({
          id,
          author: parseJson(row.author, {}),
          image: file ?? null,
          imageMime: file ? "image/png" : null,
          created,
          updated,
        })
        .onConflictDoNothing();
    } else if (kind === "cells") {
      await db
        .insert(schema.cells)
        .values({
          id,
          type: String(row.type ?? "grid"),
          number: Number(row.number ?? 0),
          title: String(row.title ?? ""),
          conditions: parseJson(row.conditions, {}),
          cellType: String(row.cellType ?? ""),
          difficulty: String(row.difficulty ?? ""),
          ladderTo: Number(row.ladderTo ?? 0),
          snakeTo: Number(row.snakeTo ?? 0),
          status: parseJson(row.status, null),
          captured: parseJson(row.captured, null),
          created,
          updated,
        })
        .onConflictDoNothing();
    } else if (kind === "presets") {
      await db
        .insert(schema.presets)
        .values({
          id,
          label: String(row.label ?? ""),
          games: parseJson(row.games, []),
          created,
          updated,
        })
        .onConflictDoNothing();
    }
  }

  console.log(`${kind}: ${rows.length}`);
}

async function main() {
  if (!existsSync(PB_DB)) {
    console.error(
      `PocketBase data.db не найден: ${PB_DB}\n` +
        `locate path to data.db from PocketBase.`,
    );
    process.exit(1);
  }

  const pb = new Database(PB_DB, { readonly: true });
  console.log("Import from", PB_DB);

  await importUsers(pb);

  const tables = pb
    .query(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND substr(name, 1, 1) != '_'`,
    )
    .all() as { name: string }[];

  for (const { name } of tables) {
    if (name === "users") continue;
    const collRow = pb
      .query(`SELECT id FROM _collections WHERE name = ?`)
      .get(name) as { id: string } | null;
    const collectionId = collRow?.id;
    if (collectionId && COLLECTION_MAP[collectionId]) {
      await importCollection(pb, name, collectionId);
    }
  }

  console.log("Done.");
}

main().catch(console.error);
