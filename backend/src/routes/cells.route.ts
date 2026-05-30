import { Elysia } from "elysia";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema";
import { nowIso } from "../lib/dates";
import { withRecordMeta } from "../lib/record";
import { broadcast } from "../lib/ws";
import { createActivity } from "../services/activity.service";

import { dbPlugin } from "../plugins/db.plugin";

export const cellsRoute = new Elysia({ prefix: "/cells" })
  .use(dbPlugin)
  .get("/", async ({ db }) => {
    const rows = await db.select().from(schema.cells);
    return rows.map((r) => withRecordMeta(r, "cells"));
  })
  .get("/by-number/:number", async ({ params, db, set }) => {
    const num = Number(params.number);
    const [row] = await db
      .select()
      .from(schema.cells)
      .where(eq(schema.cells.number, num));
    if (!row) {
      set.status = 404;
      return { error: "Not found" };
    }
    return withRecordMeta(row, "cells");
  })
  .get("/:id", async ({ params, db, set }) => {
    const [row] = await db
      .select()
      .from(schema.cells)
      .where(eq(schema.cells.id, params.id));
    if (!row) {
      set.status = 404;
      return { error: "Not found" };
    }
    return withRecordMeta(row, "cells");
  })
  .patch("/:id", async ({ params, body, db }) => {
    await db
      .update(schema.cells)
      .set({ ...body, updated: nowIso() })
      .where(eq(schema.cells.id, params.id));
    broadcast("cells", "update", params.id);
    const [row] = await db
      .select()
      .from(schema.cells)
      .where(eq(schema.cells.id, params.id));
    return withRecordMeta(row!, "cells");
  })
  .post("/:id/capture", async ({ params, body, db }) => {
    const [cell] = await db
      .select()
      .from(schema.cells)
      .where(eq(schema.cells.id, params.id));
    if (!cell) return { error: "Not found" };

    const captured = [...(cell.captured ?? []), body.username];
    await db
      .update(schema.cells)
      .set({ captured, updated: nowIso() })
      .where(eq(schema.cells.id, params.id));

    await createActivity(db, {
      author: body.userId,
      image: "✅",
      type: "emoji",
      text: `${body.username} захватил клетку ${cell.number}`,
    });

    broadcast("cells", "update", params.id);
    return { ok: true };
  });

export const rulesRoute = new Elysia({ prefix: "/rules" })
  .use(dbPlugin)
  .get("/", async ({ db }) => {
    const rows = await db.select().from(schema.rules);
    return rows.map((r) => withRecordMeta(r, "rules"));
  });
