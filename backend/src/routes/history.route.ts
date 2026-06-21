import { Elysia, t } from "elysia";
import { desc, eq, sql, and } from "drizzle-orm";
import * as schema from "@/db/schema.db";
import { rawDb } from "@/db/index.db";
import { authPlugin, databasePlugin } from "@/plugins/index.plugin";
import type {
  StatsRow,
  GameDistRow,
  BetDistRow,
  LeaderboardRow,
} from "@/types/history";

export default new Elysia({ prefix: "/history" })
  .use(databasePlugin)
  .use(authPlugin)
  .get(
    "/",
    async ({ query, user, set, db }) => {
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
      requireAuth: true,
    },
  )
  .get(
    "/stats",
    async ({ user, set }) => {
      const dailyNet = rawDb
        .query<StatsRow, [string]>(
          `SELECT DATE(created) AS date, SUM(net) AS net, COUNT(*) AS gamesPlayed
           FROM history WHERE user_id = ?
           GROUP BY DATE(created) ORDER BY date DESC LIMIT 30`,
        )
        .all(user.sub);

      const gameDistribution = rawDb
        .query<GameDistRow, [string]>(
          `SELECT type, COUNT(*) AS count, SUM(net) AS totalNet
           FROM history WHERE user_id = ?
           GROUP BY type ORDER BY count DESC`,
        )
        .all(user.sub);

      const allBets = rawDb
        .query<
          { bid: number },
          [string]
        >(`SELECT bid FROM history WHERE user_id = ? AND bid > 0`)
        .all(user.sub);

      const betRanges = [
        { label: "1-5", min: 1, max: 5 },
        { label: "6-10", min: 6, max: 10 },
        { label: "11-20", min: 11, max: 20 },
        { label: "21-50", min: 21, max: 50 },
        { label: "50+", min: 51, max: Infinity },
      ];
      const betDistribution: BetDistRow[] = betRanges.map((r) => ({
        range: r.label,
        count: allBets.filter((b) => b.bid >= r.min && b.bid <= r.max).length,
      }));

      const [summary] = rawDb
        .query<
          {
            totalPlayed: number;
            totalWagered: number;
            totalNet: number;
            winRate: number;
            biggestWin: number;
            avgBet: number;
          },
          [string]
        >(
          `SELECT
            COUNT(*) AS totalPlayed,
            COALESCE(SUM(bid), 0) AS totalWagered,
            COALESCE(SUM(net), 0) AS totalNet,
            CASE WHEN COUNT(*) > 0 THEN ROUND(CAST(COUNT(CASE WHEN net > 0 THEN 1 END) AS REAL) / COUNT(*) * 100, 1) ELSE 0 END AS winRate,
            COALESCE(MAX(CASE WHEN net > 0 THEN net END), 0) AS biggestWin,
            ROUND(COALESCE(AVG(bid), 0), 1) AS avgBet
           FROM history WHERE user_id = ?`,
        )
        .all(user.sub);

      return {
        dailyNet: dailyNet.reverse(),
        gameDistribution,
        betDistribution,
        summary: summary ?? {
          totalPlayed: 0,
          totalWagered: 0,
          totalNet: 0,
          winRate: 0,
          biggestWin: 0,
          avgBet: 0,
        },
      };
    },
    {
      requireAuth: true,
    },
  )
  .get(
    "/leaderboard",
    async ({ query }) => {
      const typeFilter = query.gameType
        ? `AND h.type = '${query.gameType.replace(/'/g, "''")}'`
        : "";
      const periodFilter =
        query.period === "weekly"
          ? `AND h.created >= datetime('now', '-7 days')`
          : "";
      const limit = Math.min(Math.max(1, query.limit ?? 50), 100);

      const sql_query = `
        SELECT
          u.id AS userId,
          u.username,
          u.avatar,
          u.color,
          u.money AS currentMoney,
          u.tickets AS currentTickets,
          COALESCE(SUM(h.net), 0) AS totalNet,
          COUNT(*) AS gamesPlayed,
          COUNT(CASE WHEN h.net > 0 THEN 1 END) AS wins,
          COUNT(CASE WHEN h.net < 0 THEN 1 END) AS losses,
          COALESCE(MAX(CASE WHEN h.net > 0 THEN h.net END), 0) AS biggestWin
        FROM history h
        JOIN users u ON u.id = h.user_id
        WHERE 1=1 ${typeFilter} ${periodFilter}
        GROUP BY h.user_id
        ORDER BY totalNet DESC
        LIMIT ?
      `;

      const rows = rawDb.query<LeaderboardRow, [number]>(sql_query).all(limit);

      return { data: rows };
    },
    {
      query: t.Optional(
        t.Object({
          gameType: t.Optional(
            t.Union([
              t.Literal("dice"),
              t.Literal("blackjack"),
              t.Literal("rocket"),
              t.Literal("pachinko"),
              t.Literal("mines"),
            ]),
          ),
          period: t.Optional(
            t.Union([t.Literal("alltime"), t.Literal("weekly")]),
          ),
          limit: t.Optional(t.Numeric()),
        }),
      ),
    },
  );
