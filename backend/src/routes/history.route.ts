import { Elysia, t } from "elysia";
import { desc, eq, sql, and } from "drizzle-orm";
import * as schema from "../db/schema";
import { authPlugin } from "../plugins/auth.plugin";
import { dbPlugin } from "../plugins/db.plugin";

export const historyRoute = new Elysia({ prefix: "/history" })
  .use(dbPlugin)
  .use(authPlugin)
  .get(
    "/",
    async ({ query, user, set, db }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      const page = Math.max(1, query.page ?? 1);
      const limit = Math.min(Math.max(1, query.limit ?? 50), 100);
      const offset = (page - 1) * limit;

      const where = [];
      where.push(eq(schema.history.userId, user.sub));
      if (query.type) {
        where.push(eq(schema.history.type, query.type));
      }

      const conditions = where.length > 1 ? and(...where) : where[0];

      const rows = await db
        .select()
        .from(schema.history)
        .where(conditions)
        .orderBy(desc(schema.history.created))
        .limit(limit)
        .offset(offset);

      const [countResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(schema.history)
        .where(conditions);

      return {
        data: rows,
        total: Number(countResult?.count ?? 0),
        page,
        limit,
      };
    },
    {
      query: t.Optional(
        t.Object({
          page: t.Optional(t.Numeric()),
          limit: t.Optional(t.Numeric()),
          type: t.Optional(t.String()),
        }),
      ),
      detail: {
        tags: ["history"],
        summary: "Get paginated history for current user, optionally filtered by type",
      },
    },
  );
