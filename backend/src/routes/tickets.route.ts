import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema.db";
import { newId, nowIso } from "@/lib/index.utils";
import { broadcast } from "@/lib/websocket.utils";
import Logger from "@/lib/logger.utils";
import { updateTicketItem } from "@/lib/ticket.helpers";
import servicesPlugin from "@/services.server";
import { authPlugin, databasePlugin } from "@/plugins/index.plugin";
import JackpotService from "@/services/gambling/jackpot.service";

const logger = new Logger("TICKETS");

const MAX_TICKETS_PER_DAY = 250;
const TICKET_PRICE = 1;
const MIN_TICKETS_PER_SALE = 5;
const TICKET_ITEM_LABEL = "Тикет";
const RESET_HOUR_MSK = 15;

function getTicketDay(): string {
  const now = new Date();
  const msk = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  if (msk.getUTCHours() >= RESET_HOUR_MSK) {
    return msk.toISOString().slice(0, 10);
  }
  const yesterday = new Date(msk);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return yesterday.toISOString().slice(0, 10);
}

function shouldResetTickets(user: typeof schema.users.$inferSelect): boolean {
  if (!user.ticketsDate) return true;
  const currentDay = getTicketDay();
  const userDay = user.ticketsDate;
  return userDay !== currentDay;
}

export default new Elysia({ prefix: "/utils" })
  .use(databasePlugin)
  .use(servicesPlugin)
  .use(authPlugin)

  .get(
    "/tickets",
    async ({ user, db }) => {
      const [userRow] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, user.sub))
        .limit(1);

      if (!userRow) return { error: "User not found" };

      const reset = shouldResetTickets(userRow);
      const dailyRemaining = reset
        ? MAX_TICKETS_PER_DAY
        : Math.max(0, MAX_TICKETS_PER_DAY - userRow.ticketsBoughtToday);

      return {
        balance: userRow.tickets,
        dailyRemaining,
        maxPerDay: MAX_TICKETS_PER_DAY,
        price: TICKET_PRICE,
      };
    },
    {
      requireAuth: true,
    },
  )

  .post(
    "/tickets/buy",
    async ({
      body,
      user,
      db,
      economyService: _economyService,
      userService: _userService,
    }) => {
      const [userRow] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, user.sub))
        .limit(1);

      if (!userRow) return { error: "User not found" };
      if (userRow.gamblingBanned) return { error: "Banned from gambling" };

      const amount = body.amount;
      if (!Number.isInteger(amount) || amount < 1) {
        return { error: "Invalid amount" };
      }

      const reset = shouldResetTickets(userRow);
      const boughtToday = reset ? 0 : userRow.ticketsBoughtToday;

      if (boughtToday + amount > MAX_TICKETS_PER_DAY) {
        const remaining = MAX_TICKETS_PER_DAY - boughtToday;
        return {
          error: `Daily limit exceeded. You can buy ${remaining} more tickets today.`,
          remaining,
        };
      }

      const cost = amount * TICKET_PRICE;
      if (userRow.money < cost) {
        return { error: "Not enough money" };
      }

      const ts = nowIso();
      const newTickets = userRow.tickets + amount;
      const newBoughtToday = boughtToday + amount;
      const currentDay = getTicketDay();

      await db
        .update(schema.users)
        .set({
          money: userRow.money - cost,
          tickets: newTickets,
          ticketsBoughtToday: newBoughtToday,
          ticketsDate: currentDay,
          updated: ts,
        })
        .where(eq(schema.users.id, user.sub));

      await updateTicketItem(db, user.sub, newTickets);

      const jp = new JackpotService(db);
      await jp.addToPool(amount);

      broadcast("users", "update", user.sub);
      logger.setAuthor(String(user?.username)).info(`bought ${amount} tickets`);

      return {
        ok: true,
        balance: newTickets,
        dailyRemaining: Math.max(0, MAX_TICKETS_PER_DAY - newBoughtToday),
        cost,
      };
    },
    {
      requireAuth: true,
      body: t.Object({ amount: t.Integer({ minimum: 1 }) }),
    },
  )

  .post(
    "/tickets/sell-direct",
    async ({ body, user, db, userService: _userService }) => {
      const amount = body.amount;
      if (!Number.isInteger(amount) || amount < 1) {
        return { error: "Invalid amount" };
      }

      const [userRow] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, user.sub))
        .limit(1);

      if (!userRow) return { error: "User not found" };
      if (userRow.tickets < amount) {
        return { error: "Not enough tickets" };
      }

      const payout = amount * TICKET_PRICE;
      const ts = nowIso();
      const newTickets = userRow.tickets - amount;

      await db
        .update(schema.users)
        .set({
          money: userRow.money + payout,
          tickets: newTickets,
          updated: ts,
        })
        .where(eq(schema.users.id, user.sub));

      await updateTicketItem(db, user.sub, newTickets);

      broadcast("users", "update", user.sub);
      logger
        .setAuthor(String(user?.username))
        .info(`sold ${amount} tickets for ${payout} money`);

      return { ok: true, payout, newBalance: newTickets };
    },
    {
      requireAuth: true,
      body: t.Object({ amount: t.Integer({ minimum: 1 }) }),
    },
  )

  .post(
    "/tickets/sell",
    async ({ body, user, db, economyService: _economyService }) => {
      const [userRow] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, user.sub))
        .limit(1);

      if (!userRow) return { error: "User not found" };

      const quantity = body.quantity;
      const perTicketPrice = body.perTicketPrice;

      if (
        !Number.isInteger(quantity) ||
        quantity < MIN_TICKETS_PER_SALE ||
        !Number.isInteger(perTicketPrice) ||
        perTicketPrice < 1
      ) {
        return { error: "Invalid sale parameters" };
      }

      if (userRow.tickets < quantity) {
        return { error: "Not enough tickets" };
      }

      const totalPrice = quantity * perTicketPrice;
      const ts = nowIso();
      const id = newId();

      const newTickets = userRow.tickets - quantity;
      await db
        .update(schema.users)
        .set({ tickets: newTickets, updated: ts })
        .where(eq(schema.users.id, user.sub));

      await updateTicketItem(db, user.sub, newTickets);

      await db.insert(schema.market).values({
        id,
        type: "ticket",
        originalId: null,
        owner: {
          id: userRow.id,
          username: userRow.username,
          avatar: userRow.avatar,
        },
        label: TICKET_ITEM_LABEL,
        description: `${quantity} тикетов по ${perTicketPrice} чубриков за штуку`,
        charge: quantity,
        price: totalPrice,
        discount: null,
        perTicketPrice,
        created: ts,
        updated: ts,
      });

      broadcast("market", "create", id);
      logger
        .setAuthor(String(user?.username))
        .info(`listed ${quantity} tickets at ${perTicketPrice} each`);

      return { ok: true, marketId: id, quantity, totalPrice };
    },
    {
      body: t.Object({
        quantity: t.Integer({ minimum: MIN_TICKETS_PER_SALE }),
        perTicketPrice: t.Integer({ minimum: 1 }),
      }),
      requireAuth: true,
    },
  );

export const ticketMarketRoute = new Elysia({ prefix: "/market/tickets" })
  .use(databasePlugin)
  .use(servicesPlugin)
  .use(authPlugin)

  .post(
    "/:id/buy",
    async ({ params, user, db, userService }) => {
      const [listing] = await db
        .select()
        .from(schema.market)
        .where(eq(schema.market.id, params.id))
        .limit(1);

      if (!listing) return { error: "Listing not found" };
      if (listing.type !== "ticket") return { error: "Not a ticket listing" };

      const buyer = await userService.getById(user.sub);
      if (!buyer) return { error: "Buyer not found" };

      if (buyer.money < listing.price) {
        return { error: "Not enough money" };
      }

      const sellerId = (listing.owner as { id: string }).id;
      if (sellerId === user.sub) {
        return { error: "Cannot buy your own listing" };
      }

      const cost = listing.price - (listing.discount ?? 0);
      const quantity = listing.charge;
      const ts = nowIso();

      await userService.score(user.sub, -cost, true);
      await userService.score(sellerId, cost, true);

      const [sellerRow] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, sellerId))
        .limit(1);

      const [buyerRow] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, user.sub))
        .limit(1);

      if (sellerRow) {
        await db
          .update(schema.users)
          .set({
            tickets: sellerRow.tickets - quantity,
            updated: ts,
          })
          .where(eq(schema.users.id, sellerId));
        await updateTicketItem(db, sellerId, sellerRow.tickets - quantity);
      }

      if (buyerRow) {
        await db
          .update(schema.users)
          .set({
            tickets: buyerRow.tickets + quantity,
            updated: ts,
          })
          .where(eq(schema.users.id, user.sub));
        await updateTicketItem(db, user.sub, buyerRow.tickets + quantity);
      }

      await db.delete(schema.market).where(eq(schema.market.id, params.id));

      broadcast("users", "update", sellerId);
      broadcast("users", "update", user.sub);
      broadcast("market", "delete", params.id);
      logger
        .setAuthor(String(user?.username))
        .info(
          `bought ${quantity} tickets from ${sellerRow?.username ?? sellerId}`,
        );

      return {
        ok: true,
        quantity,
        cost,
        newBalance: buyerRow ? buyerRow.tickets + quantity : 0,
      };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
    },
  )

  .post(
    "/:id/remove",
    async ({ params, user, db }) => {
      const [listing] = await db
        .select()
        .from(schema.market)
        .where(eq(schema.market.id, params.id))
        .limit(1);

      if (!listing) return { error: "Listing not found" };
      if (listing.type !== "ticket") return { error: "Not a ticket listing" };

      const owner = listing.owner as { id: string };
      if (owner.id !== user.sub) return { error: "Not your listing" };

      const quantity = listing.charge;
      const ts = nowIso();

      const [userRow] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, user.sub))
        .limit(1);

      if (userRow) {
        const newTickets = userRow.tickets + quantity;
        await db
          .update(schema.users)
          .set({ tickets: newTickets, updated: ts })
          .where(eq(schema.users.id, user.sub));
        await updateTicketItem(db, user.sub, newTickets);
      }

      await db.delete(schema.market).where(eq(schema.market.id, params.id));

      broadcast("market", "delete", params.id);
      broadcast("users", "update", user.sub);
      logger.setAuthor(String(user?.username)).info(`removed ticket listing`);

      return { ok: true, refundedTickets: quantity };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
    },
  );
