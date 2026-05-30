import { eq, inArray } from "drizzle-orm";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import * as schema from "../db/schema";
import { newId } from "../lib/ids";
import { nowIso } from "../lib/dates";
import { withRecordMeta } from "../lib/record";
import { broadcast } from "../lib/ws";
import { createActivity } from "./activity.service";
import { changeUserStatus, getUserById, scoreUser } from "./user.service";

type Db = BunSQLiteDatabase<typeof schema>;

function mapInventory(row: typeof schema.inventory.$inferSelect) {
  return withRecordMeta(row, "inventory");
}

function mapMarket(row: typeof schema.market.$inferSelect) {
  return withRecordMeta(row, "market");
}

async function copyInventoryFromItem(
  db: Db,
  item: typeof schema.items.$inferSelect,
  ownerId: string,
) {
  const id = newId();
  const ts = nowIso();
  await db.insert(schema.inventory).values({
    id,
    type: item.type,
    owner: ownerId,
    label: item.label,
    description: item.description,
    charge: item.charge,
    image: item.image,
    imageMime: item.imageMime,
    created: ts,
    updated: ts,
  });
  broadcast("inventory", "create", id);
  return id;
}

export async function addInventory(db: Db, userId: string, itemId: string) {
  const [item] = await db
    .select()
    .from(schema.items)
    .where(eq(schema.items.id, itemId));
  if (!item) return null;

  const user = await getUserById(db, userId);
  if (!user) return null;

  if (item.type === "effect") {
    await changeUserStatus(db, userId, item.label, "add");
  } else {
    await copyInventoryFromItem(db, item, userId);
  }

  await createActivity(db, {
    author: userId,
    image: user.avatar,
    type: "emoji",
    text: `${user.username} получил предмет ${item.label}`,
  });

  return true;
}

export async function sellInventory(
  db: Db,
  inventoryId: string,
  ownerId: string,
  price: number,
) {
  if (!price) return null;

  const [itemData] = await db
    .select()
    .from(schema.inventory)
    .where(eq(schema.inventory.id, inventoryId));
  const user = await getUserById(db, ownerId);
  if (!itemData || !user) return null;

  const id = newId();
  const ts = nowIso();
  await db.insert(schema.market).values({
    id,
    type: itemData.type,
    originalId: itemData.id,
    owner: { id: user.id, username: user.username, avatar: user.avatar },
    label: itemData.label,
    description: itemData.description,
    charge: itemData.charge,
    image: itemData.image,
    imageMime: itemData.imageMime,
    price,
    discount: null,
    created: ts,
    updated: ts,
  });

  await db.delete(schema.inventory).where(eq(schema.inventory.id, inventoryId));

  await createActivity(db, {
    author: ownerId,
    image: user.avatar,
    type: "emoji",
    text: `${user.username} выставил на продажу предмет ${itemData.label} за ${price}`,
  });

  broadcast("market", "create", id);
  broadcast("inventory", "delete", inventoryId);
  return mapMarket(
    (await db.select().from(schema.market).where(eq(schema.market.id, id)))[0]!,
  );
}

export async function buyMarket(
  db: Db,
  marketId: string,
  newOwnerId: string,
  oldOwnerId: string,
) {
  const [itemData] = await db
    .select()
    .from(schema.market)
    .where(eq(schema.market.id, marketId));
  if (!itemData) return null;

  const buyer = await getUserById(db, newOwnerId);
  if (!buyer || buyer.money < itemData.price) return null;

  const cost = itemData.price - (itemData.discount ?? 0);
  await scoreUser(db, newOwnerId, -cost, true);
  await scoreUser(db, oldOwnerId, cost, true);

  const invId = newId();
  const ts = nowIso();
  await db.insert(schema.inventory).values({
    id: invId,
    type: itemData.type,
    owner: newOwnerId,
    label: itemData.label,
    description: itemData.description,
    charge: itemData.charge,
    image: itemData.image,
    imageMime: itemData.imageMime,
    created: ts,
    updated: ts,
  });

  await db.delete(schema.market).where(eq(schema.market.id, marketId));

  await createActivity(db, {
    author: newOwnerId,
    image: buyer.avatar,
    type: "emoji",
    text: `${buyer.username} купил предмет ${itemData.label} за ${cost}`,
  });

  broadcast("market", "delete", marketId);
  broadcast("inventory", "create", invId);
  return true;
}

export async function removeMarketListing(db: Db, marketId: string) {
  const [existing] = await db
    .select()
    .from(schema.market)
    .where(eq(schema.market.id, marketId));
  if (!existing) return null;

  const owner = existing.owner as { id: string };
  const invId = newId();
  const ts = nowIso();

  await db.insert(schema.inventory).values({
    id: invId,
    type: existing.type,
    owner: owner.id,
    label: existing.label,
    description: existing.description,
    charge: existing.charge,
    image: existing.image,
    imageMime: existing.imageMime,
    created: ts,
    updated: ts,
  });

  await db.delete(schema.market).where(eq(schema.market.id, marketId));

  const payout = existing.price - (existing.discount ?? 0);
  await scoreUser(db, owner.id, payout);

  broadcast("market", "delete", marketId);
  broadcast("inventory", "create", invId);
  return true;
}

export async function tradeInventory(
  db: Db,
  currentUser: { id: string; money: number; items: string[] },
  otherUser: { id: string; money: number; items: string[] },
) {
  if (currentUser.money > 0) {
    await scoreUser(db, otherUser.id, currentUser.money, true);
    await scoreUser(db, currentUser.id, -currentUser.money, true);
  }
  if (currentUser.items.length > 0) {
    await db
      .update(schema.inventory)
      .set({ owner: otherUser.id, updated: nowIso() })
      .where(inArray(schema.inventory.id, currentUser.items));
    for (const itemId of currentUser.items) {
      broadcast("inventory", "update", itemId);
    }
  }

  if (otherUser.money > 0) {
    await scoreUser(db, currentUser.id, otherUser.money, true);
    await scoreUser(db, otherUser.id, -otherUser.money, true);
  }
  if (otherUser.items.length > 0) {
    await db
      .update(schema.inventory)
      .set({ owner: currentUser.id, updated: nowIso() })
      .where(inArray(schema.inventory.id, otherUser.items));
    for (const itemId of otherUser.items) {
      broadcast("inventory", "update", itemId);
    }
  }

  return true;
}

export async function discountMarket(
  db: Db,
  marketId: string,
  ownerId: string,
  price: number,
  discountPrice: number,
) {
  await db
    .update(schema.market)
    .set({
      discount: discountPrice !== price ? discountPrice : null,
      updated: nowIso(),
    })
    .where(eq(schema.market.id, marketId));

  await scoreUser(db, ownerId, price - discountPrice);
  broadcast("market", "update", marketId);
  return true;
}

export async function removeInventoryById(db: Db, inventoryId: string) {
  await db.delete(schema.inventory).where(eq(schema.inventory.id, inventoryId));
  broadcast("inventory", "delete", inventoryId);
}

export async function transferInventoryOwner(
  db: Db,
  inventoryId: string,
  newOwnerId: string,
) {
  await db
    .update(schema.inventory)
    .set({ owner: newOwnerId, updated: nowIso() })
    .where(eq(schema.inventory.id, inventoryId));
  broadcast("inventory", "update", inventoryId);
}

export async function chargeInventory(
  db: Db,
  inventoryId: string,
  oldCharge: number,
  newCharge: number,
) {
  const total = oldCharge + newCharge;
  if (total === 0) {
    await db
      .delete(schema.inventory)
      .where(eq(schema.inventory.id, inventoryId));
    broadcast("inventory", "delete", inventoryId);
    return null;
  }
  await db
    .update(schema.inventory)
    .set({ charge: total, updated: nowIso() })
    .where(eq(schema.inventory.id, inventoryId));
  broadcast("inventory", "update", inventoryId);
  const [row] = await db
    .select()
    .from(schema.inventory)
    .where(eq(schema.inventory.id, inventoryId));
  return row ? mapInventory(row) : null;
}
