import { Elysia, t } from "elysia";
import { desc, eq } from "drizzle-orm";
import * as schema from "@/db/schema.db";
import { databasePlugin } from "@/plugins/index.plugin";

export default new Elysia({ prefix: "/stats/user" })
  .use(databasePlugin)
  .get("/:userId", async ({ params: { userId }, db }) => {
    let inventoryLogs: (typeof schema.inventoryLog.$inferSelect)[] = [];
    try {
      inventoryLogs = await db
        .select()
        .from(schema.inventoryLog)
        .where(eq(schema.inventoryLog.owner, userId))
        .orderBy(desc(schema.inventoryLog.created))
        .limit(5000);
    } catch {}

    const [inventoryItems, userData, gamesData] = await Promise.all([
      db
        .select()
        .from(schema.inventory)
        .where(eq(schema.inventory.owner, userId)),
      db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, userId))
        .then((r) => r[0] ?? null),
      db.select().from(schema.games).where(eq(schema.games.userId, userId)),
    ]);

    const profile = {
      accountAge: userData
        ? Math.floor(
            (Date.now() - new Date(userData.created).getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 0,
      totalMoney: userData?.money ?? 0,
      position: userData?.position ?? 0,
      statusCount: userData?.status?.length ?? 0,
      registeredDate: userData?.created ?? "",
    };

    const ACQUISITION = new Set(["receive", "buy", "trade_in", "grant"]);
    const itemsByType = new Map<string, number>();
    const labelCounts = new Map<string, number>();

    for (const log of inventoryLogs) {
      if (!ACQUISITION.has(log.action)) continue;
      itemsByType.set(log.itemType, (itemsByType.get(log.itemType) ?? 0) + 1);
      labelCounts.set(log.itemLabel, (labelCounts.get(log.itemLabel) ?? 0) + 1);
    }

    const totalCharge = inventoryItems.reduce((s, i) => s + i.charge, 0);

    const inventory = {
      totalItems: inventoryItems.length,
      itemsByType: Array.from(itemsByType.entries()).map(([type, count]) => ({
        type,
        count,
      })),
      topItems: Array.from(labelCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([label, count]) => ({ label, count })),
      totalCharge,
      uniqueLabels: labelCounts.size,
    };

    const dailyActivityMap = new Map<
      string,
      {
        date: string;
        received: number;
        sent: number;
        sold: number;
        bought: number;
        used: number;
        deleted: number;
        listed: number;
        unlisted: number;
      }
    >();

    let totalReceived = 0;
    let totalSent = 0;
    let totalSold = 0;
    let totalBought = 0;
    let totalUsed = 0;
    let totalDeleted = 0;
    let marketListed = 0;
    let marketUnlisted = 0;
    let tradesIn = 0;
    let tradesOut = 0;

    for (const log of inventoryLogs) {
      const day = log.created?.slice(0, 10) ?? "unknown";
      if (!dailyActivityMap.has(day)) {
        dailyActivityMap.set(day, {
          date: day,
          received: 0,
          sent: 0,
          sold: 0,
          bought: 0,
          used: 0,
          deleted: 0,
          listed: 0,
          unlisted: 0,
        });
      }
      const entry = dailyActivityMap.get(day)!;

      switch (log.action) {
        case "receive":
          entry.received++;
          totalReceived++;
          break;
        case "send":
          entry.sent++;
          totalSent++;
          break;
        case "sell":
          entry.sold++;
          totalSold++;
          break;
        case "buy":
          entry.bought++;
          totalBought++;
          break;
        case "use":
          entry.used++;
          totalUsed++;
          break;
        case "delete":
          entry.deleted++;
          totalDeleted++;
          break;
        case "market_list":
          entry.listed++;
          marketListed++;
          break;
        case "market_unlist":
          entry.unlisted++;
          marketUnlisted++;
          break;
        case "trade_in":
          entry.bought++;
          tradesIn++;
          break;
        case "trade_out":
          entry.sent++;
          tradesOut++;
          break;
      }
    }

    const dailyActivity = Array.from(dailyActivityMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-90);

    const inventoryHistory = {
      dailyActivity,
      totalReceived,
      totalSent,
      totalSold,
      totalBought,
      totalUsed,
      totalDeleted,
      marketListed,
      marketUnlisted,
      tradesIn,
      tradesOut,
    };

    const historyRows = await db
      .select()
      .from(schema.history)
      .where(eq(schema.history.userId, userId));

    const totalPlayed = historyRows.length;
    const totalWagered = historyRows.reduce((s, h) => s + h.bid, 0);
    const totalNet = historyRows.reduce((s, h) => s + h.net, 0);
    const wins = historyRows.filter((h) => h.net > 0).length;
    const totalBidsNonZero = historyRows.filter((h) => h.bid > 0).length;

    const gambling = {
      totalPlayed,
      totalWagered,
      totalNet,
      winRate:
        totalBidsNonZero > 0 ? Math.round((wins / totalBidsNonZero) * 100) : 0,
      biggestWin: historyRows.reduce((m, h) => Math.max(m, h.payout), 0),
      avgBet: totalPlayed > 0 ? Math.round(totalWagered / totalPlayed) : 0,
    };

    const games = {
      total: gamesData.length,
      completed: gamesData.filter((g) => g.status === "COMPLETED").length,
      playing: gamesData.filter((g) => g.status === "PLAYING").length,
      dropped: gamesData.filter((g) => g.status === "DROPPED").length,
      rerolled: gamesData.filter((g) => g.status === "REROLLED").length,
      reviewsCount: gamesData.filter((g) => g.review).length,
      totalPlaytime: gamesData.reduce((s, g) => {
        const pt = g.playtime as { hltb?: number; user?: number } | null;
        return s + (pt?.hltb ?? pt?.user ?? 0);
      }, 0),
    };

    return {
      profile,
      inventory,
      inventoryHistory,
      gambling,
      games,
    };
  });
