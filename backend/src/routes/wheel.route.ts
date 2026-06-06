import { Elysia, t } from "elysia";
import { desc, eq, sql } from "drizzle-orm";
import * as schema from "../db/schema";
import { newId } from "../lib/ids";
import { nowIso } from "../lib/dates";
import { SPIN_COST } from "../lib/gambling.constants";
import { authPlugin } from "../plugins/auth.plugin";
import { dbPlugin } from "../plugins/db.plugin";
import { servicesPlugin } from "../services/services.plugin";

const WheelItemSchema = t.Object({
  id: t.String(),
  label: t.String(),
  image: t.String(),
  type: t.String(),
});

function fisherYatesShuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  const bytes = new Uint32Array(a.length);
  crypto.getRandomValues(bytes);
  for (let i = a.length - 1; i > 0; i--) {
    const j = bytes[i] % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickWinner(length: number): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % length;
}

export const wheelRoute = new Elysia({ prefix: "/wheel" })
  .use(dbPlugin)
  .use(servicesPlugin)
  .use(authPlugin)
  .post(
    "/spin",
    async ({ body, user, set, db, userService }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      const { items, free, listType } = body;
      if (!Array.isArray(items) || items.length === 0) {
        set.status = 400;
        return { error: "Items array is required" };
      }

      const currentUser = await userService.getById(user.sub);

      if (!free) {
        if (!currentUser || currentUser.money < SPIN_COST) {
          set.status = 402;
          return { error: "Недостаточно чубриков" };
        }
        await userService.score(user.sub, -SPIN_COST);
      }

      const shuffled = fisherYatesShuffle(items);
      const winnerIndex = pickWinner(shuffled.length);
      const winner = shuffled[winnerIndex];

      const id = newId();
      const ts = nowIso();
      await db.insert(schema.wheelHistory).values({
        id,
        userId: user.sub,
        owner: currentUser
          ? { id: currentUser.id, username: currentUser.username }
          : null,
        itemId: winner.id,
        itemLabel: winner.label,
        itemImage: winner.type === "image" ? winner.image : "",
        itemType: winner.type,
        listType: listType ?? "general",
        cost: free ? 0 : SPIN_COST,
        free,
        created: ts,
      });

      return { shuffled, winnerIndex };
    },
    {
      body: t.Object({
        items: t.Array(WheelItemSchema),
        free: t.Boolean(),
        listType: t.Optional(t.String()),
      }),
      detail: {
        tags: ["wheel"],
        summary: "Spin the wheel — shuffles items, picks winner, deducts cost",
      },
    },
  )
  .get(
    "/history",
    async ({ query, user, set, db }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      const page = Math.max(1, query.page ?? 1);
      const limit = Math.min(Math.max(1, query.limit ?? 50), 100);
      const offset = (page - 1) * limit;

      const rows = await db
        .select()
        .from(schema.wheelHistory)
        .where(eq(schema.wheelHistory.userId, user.sub))
        .orderBy(desc(schema.wheelHistory.created))
        .limit(limit)
        .offset(offset);

      const [countResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(schema.wheelHistory)
        .where(eq(schema.wheelHistory.userId, user.sub));

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
        }),
      ),
      detail: {
        tags: ["wheel"],
        summary: "Get paginated wheel spin history for current user",
      },
    },
  )
  .delete(
    "/history",
    async ({ user, set, db }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      await db
        .delete(schema.wheelHistory)
        .where(eq(schema.wheelHistory.userId, user.sub));

      return { ok: true };
    },
    {
      detail: {
        tags: ["wheel"],
        summary: "Clear wheel spin history for current user",
      },
    },
  );
