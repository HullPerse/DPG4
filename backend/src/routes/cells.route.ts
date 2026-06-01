import { Elysia, t } from "elysia";
import { and, asc, desc as descOrder, eq, not, type SQL } from "drizzle-orm";
import * as schema from "../db/schema";
import { nowIso } from "../lib/dates";
import { withRecordMeta } from "../lib/record";
import { broadcast } from "../lib/ws";
import { logger } from "../lib/logger";
import { createActivity } from "../services/activity.service";
import { dbPlugin } from "../plugins/db.plugin";

const cellPatchBody = t.Object({
  type: t.Optional(t.String()),
  number: t.Optional(t.Number()),
  title: t.Optional(t.String()),
  conditions: t.Optional(t.Any()),
  cellType: t.Optional(t.String()),
  difficulty: t.Optional(t.String()),
  ladderTo: t.Optional(t.Number()),
  snakeTo: t.Optional(t.Number()),
  status: t.Optional(t.Nullable(t.Array(t.String()))),
  captured: t.Optional(t.Nullable(t.Array(t.String()))),
});

export const cellsRoute = new Elysia({ prefix: "/cells" })
  .use(dbPlugin)
  .get("/", async ({ db, query }) => {
    let q = db.select().from(schema.cells);
    const conditions: SQL[] = [];

    if (query.type) {
      conditions.push(eq(schema.cells.type, query.type));
    }

    if (query.excludeType) {
      conditions.push(not(eq(schema.cells.type, query.excludeType)));
    }

    if (query.excludeNumber) {
      conditions.push(not(eq(schema.cells.number, Number(query.excludeNumber))));
    }

    if (conditions.length > 0) {
      q = q.where(and(...conditions)) as typeof q;
    }

    if (query.sort === "number") {
      q = q.orderBy(
        query.order === "desc" ? descOrder(schema.cells.number) : asc(schema.cells.number),
      ) as typeof q;
    }

    const rows = await q;
    return rows.map((r) => withRecordMeta(r, "cells"));
  }, {
    query: t.Optional(
      t.Object({
        type: t.Optional(t.String()),
        excludeType: t.Optional(t.String()),
        excludeNumber: t.Optional(t.String()),
        sort: t.Optional(t.String()),
        order: t.Optional(t.String()),
      }),
    ),
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
  .patch(
    "/:id",
    async ({ params, body, db }) => {
      const patch: Partial<typeof schema.cells.$inferInsert> = {
        updated: nowIso(),
      };
      if (body.type !== undefined) patch.type = body.type;
      if (body.number !== undefined) patch.number = body.number;
      if (body.title !== undefined) patch.title = body.title;
      if (body.conditions !== undefined) patch.conditions = body.conditions;
      if (body.cellType !== undefined) patch.cellType = body.cellType;
      if (body.difficulty !== undefined) patch.difficulty = body.difficulty;
      if (body.ladderTo !== undefined) patch.ladderTo = body.ladderTo;
      if (body.snakeTo !== undefined) patch.snakeTo = body.snakeTo;
      if (body.status !== undefined) patch.status = body.status;
      if (body.captured !== undefined) patch.captured = body.captured;

      await db
        .update(schema.cells)
        .set(patch)
        .where(eq(schema.cells.id, params.id));
      broadcast("cells", "update", params.id);
      const [row] = await db
        .select()
        .from(schema.cells)
        .where(eq(schema.cells.id, params.id));
      const label = row?.title || (row != null ? `#${row.number}` : params.id);
      logger.info(null, "updated cell", label);
      return withRecordMeta(row!, "cells");
    },
    { body: cellPatchBody },
  )
  .post(
    "/:id/capture",
    async ({ params, body, db }) => {
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
      logger.info(body.username, "captured cell", `#${cell.number}`);
      return { ok: true };
    },
    {
      body: t.Object({
        username: t.String(),
        userId: t.String(),
      }),
    },
  );

export const rulesRoute = new Elysia({ prefix: "/rules" })
  .use(dbPlugin)
  .get("/", async ({ db }) => {
    const rows = await db.select().from(schema.rules);
    return rows.map((r) => withRecordMeta(r, "rules"));
  });
