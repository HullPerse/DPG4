import { eq } from "drizzle-orm";
import * as schema from "@/db/schema.db";
import type { Db } from "@/types/server";
import { newId, nowIso } from "@/lib/index.utils";
import type EconomyService from "@/services/economy.service";
import { GAMBLING_BAN_THRESHOLD } from "@/lib/gambling.constants";

export interface PayoutResult {
  balance: number;
  banned: boolean;
  gamblingWinnings: number;
}

export async function processPayout(
  db: Db,
  economyService: EconomyService,
  userId: string,
  bid: number,
  payout: number,
): Promise<PayoutResult> {
  const net = payout - bid;
  const profit = Math.max(0, net);

  await economyService.addTickets(userId, payout);

  const user = await db
    .select({
      gamblingWinnings: schema.users.gamblingWinnings,
      gamblingBanned: schema.users.gamblingBanned,
      tickets: schema.users.tickets,
    })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .get();

  if (!user) return { balance: 0, banned: false, gamblingWinnings: 0 };

  const newWinnings = (user.gamblingWinnings ?? 0) + profit;
  const newBanned = newWinnings >= GAMBLING_BAN_THRESHOLD && !user.gamblingBanned;

  await db
    .update(schema.users)
    .set({
      gamblingWinnings: newWinnings,
      gamblingBanned: newBanned ? true : user.gamblingBanned,
      updated: nowIso(),
    })
    .where(eq(schema.users.id, userId));

  return {
    balance: user.tickets,
    banned: newBanned || user.gamblingBanned,
    gamblingWinnings: newWinnings,
  };
}

export async function recordHistory(
  db: Db,
  userId: string,
  gameType: string,
  label: string,
  image: string,
  bid: number,
  payout: number,
  net: number,
  data: Record<string, unknown>,
) {
  const user = await db
    .select({ id: schema.users.id, username: schema.users.username })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .get();

  if (!user) return;

  await db.insert(schema.history).values({
    id: newId(),
    userId,
    owner: { id: user.id, username: user.username },
    type: gameType,
    label,
    image,
    bid,
    payout,
    net,
    data,
    created: nowIso(),
  });
}
