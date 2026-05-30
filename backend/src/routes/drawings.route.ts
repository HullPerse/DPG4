import { Elysia } from "elysia";
import { eq, desc } from "drizzle-orm";
import * as schema from "../db/schema";
import { newId } from "../lib/ids";
import { nowIso } from "../lib/dates";
import { parseFileInput } from "../lib/files";
import { withRecordMeta } from "../lib/record";
import { broadcast } from "../lib/ws";

import { dbPlugin } from "../plugins/db.plugin";

export const drawingsRoute = new Elysia({ prefix: "/drawings" })
  .use(dbPlugin)
  .get("/", async ({ db, query }) => {
    const rows = await db
      .select()
      .from(schema.drawings)
      .orderBy(desc(schema.drawings.created));
    if (query.authorId) {
      return rows
        .filter(
          (r) => (r.author as { id?: string })?.id === query.authorId,
        )
        .map((r) => withRecordMeta(r, "drawings"));
    }
    return rows.map((r) => withRecordMeta(r, "drawings"));
  })
  .post("/", async ({ body, db }) => {
    const id = newId();
    const ts = nowIso();
    const imageFile = parseFileInput(body.image);
    const imageData = imageFile?.data ?? null;
    const imageMime = imageFile?.mime ?? null;

    await db.insert(schema.drawings).values({
      id,
      author: body.author,
      image: imageData,
      imageMime,
      created: ts,
      updated: ts,
    });
    broadcast("drawings", "create", id);
    return withRecordMeta(
      (await db.select().from(schema.drawings).where(eq(schema.drawings.id, id)))[0]!,
      "drawings",
    );
  })
  .patch("/:id", async ({ params, body, db }) => {
    const imageFile = parseFileInput(body.image);
    const patch: Partial<typeof schema.drawings.$inferInsert> = {
      updated: nowIso(),
    };
    if (body.author !== undefined) patch.author = body.author;
    if (imageFile !== undefined) {
      patch.image = imageFile?.data ?? null;
      patch.imageMime = imageFile?.mime ?? null;
    }
    await db
      .update(schema.drawings)
      .set(patch)
      .where(eq(schema.drawings.id, params.id));
    broadcast("drawings", "update", params.id);
    const [row] = await db
      .select()
      .from(schema.drawings)
      .where(eq(schema.drawings.id, params.id));
    return withRecordMeta(row!, "drawings");
  })
  .delete("/:id", async ({ params, db }) => {
    await db.delete(schema.drawings).where(eq(schema.drawings.id, params.id));
    broadcast("drawings", "delete", params.id);
    return { ok: true };
  });
