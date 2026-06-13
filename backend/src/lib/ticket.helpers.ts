import { and, eq } from "drizzle-orm";
import * as schema from "../db/schema";
import { newId } from "../lib/ids";
import { nowIso } from "../lib/dates";
import { broadcast } from "../lib/ws";
import { Db } from "@/types";

const TICKET_ITEM_LABEL = "Тикет";

export async function deductTickets(db: Db, userId: string, amount: number) {
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);
  if (!user || user.tickets < amount) throw new Error("Insufficient tickets");

  const newTickets = user.tickets - amount;
  await db
    .update(schema.users)
    .set({ tickets: newTickets, updated: nowIso() })
    .where(eq(schema.users.id, userId));

  await updateTicketItem(db, userId, newTickets);
  broadcast("users", "update", userId);

  return newTickets;
}

export async function addTickets(db: Db, userId: string, amount: number) {
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);
  if (!user) throw new Error("User not found");

  const newTickets = user.tickets + amount;
  await db
    .update(schema.users)
    .set({ tickets: newTickets, updated: nowIso() })
    .where(eq(schema.users.id, userId));

  await updateTicketItem(db, userId, newTickets);
  broadcast("users", "update", userId);

  return newTickets;
}

export async function updateTicketItem(db: Db, userId: string, ticketCount: number) {
  const [existing] = await db
    .select()
    .from(schema.inventory)
    .where(
      and(
        eq(schema.inventory.owner, userId),
        eq(schema.inventory.label, TICKET_ITEM_LABEL),
      ),
    )
    .limit(1);

  if (ticketCount <= 0) {
    if (existing) {
      await db.delete(schema.inventory).where(eq(schema.inventory.id, existing.id));
      broadcast("inventory", "delete", existing.id);
    }
    return null;
  }

  const ts = nowIso();
  if (existing) {
    await db
      .update(schema.inventory)
      .set({ charge: ticketCount, updated: ts })
      .where(eq(schema.inventory.id, existing.id));
    broadcast("inventory", "update", existing.id);
    return existing;
  }

  const id = newId();
  await db.insert(schema.inventory).values({
    id,
    type: "item",
    owner: userId,
    label: TICKET_ITEM_LABEL,
    description: "Билет для игры в казино. 1 тикет = 1 чубрик.",
    charge: ticketCount,
    created: ts,
    updated: ts,
  });
  broadcast("inventory", "create", id);
  return { id };
}
