import { eq, inArray } from "drizzle-orm";
import * as schema from "../db/schema";
import { newId } from "../lib/ids";
import { nowIso } from "../lib/dates";
import { withRecordMeta } from "../lib/record";
import { broadcast } from "../lib/ws";
import { Db } from "@/types";
import { UserService } from "@/services/user.service";
import { ActivityService } from "./activity.service";

export class EconomyService {
  constructor(
    private db: Db,
    private userService: UserService,
    private activityService: ActivityService,
  ) {}

  private mapInventory(row: typeof schema.inventory.$inferSelect) {
    return withRecordMeta(row, "inventory");
  }

  private mapMarket(row: typeof schema.market.$inferSelect) {
    return withRecordMeta(row, "market");
  }

  private async copyInventoryFromItem(
    item: typeof schema.items.$inferSelect,
    ownerId: string,
  ) {
    const id = newId();
    const ts = nowIso();
    await this.db.insert(schema.inventory).values({
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

  async addInventory(userId: string, itemId: string) {
    const [item] = await this.db
      .select()
      .from(schema.items)
      .where(eq(schema.items.id, itemId));
    if (!item) return null;

    const user = await this.userService.getById(userId);
    if (!user) return null;

    if (item.type === "effect") {
      await this.userService.changeStatus(userId, item.label, "add");
    } else {
      await this.copyInventoryFromItem(item, userId);
    }

    await this.activityService.create({
      author: userId,
      image: user.avatar,
      type: "emoji",
      text: `${user.username} получил предмет ${item.label}`,
    });

    return true;
  }

  async sellInventory(inventoryId: string, ownerId: string, price: number) {
    if (!price) return null;

    const [itemData] = await this.db
      .select()
      .from(schema.inventory)
      .where(eq(schema.inventory.id, inventoryId));
    const user = await this.userService.getById(ownerId);
    if (!itemData || !user) return null;

    const id = newId();
    const ts = nowIso();
    await this.db.insert(schema.market).values({
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

    await this.db
      .delete(schema.inventory)
      .where(eq(schema.inventory.id, inventoryId));

    await this.activityService.create({
      author: ownerId,
      image: user.avatar,
      type: "emoji",
      text: `${user.username} выставил на продажу предмет ${itemData.label} за ${price}`,
    });

    broadcast("market", "create", id);
    broadcast("inventory", "delete", inventoryId);
    return this.mapMarket(
      (
        await this.db
          .select()
          .from(schema.market)
          .where(eq(schema.market.id, id))
      )[0]!,
    );
  }

  async buyMarket(marketId: string, newOwnerId: string, oldOwnerId: string) {
    const [itemData] = await this.db
      .select()
      .from(schema.market)
      .where(eq(schema.market.id, marketId));
    if (!itemData) return null;

    const buyer = await this.userService.getById(newOwnerId);
    if (!buyer || buyer.money < itemData.price) return null;

    const cost = itemData.price - (itemData.discount ?? 0);
    await this.userService.score(newOwnerId, -cost, true);
    await this.userService.score(oldOwnerId, cost, true);

    const invId = newId();
    const ts = nowIso();
    await this.db.insert(schema.inventory).values({
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

    await this.db.delete(schema.market).where(eq(schema.market.id, marketId));

    await this.activityService.create({
      author: newOwnerId,
      image: buyer.avatar,
      type: "emoji",
      text: `${buyer.username} купил предмет ${itemData.label} за ${cost}`,
    });

    broadcast("market", "delete", marketId);
    broadcast("inventory", "create", invId);
    return true;
  }

  async removeMarketListing(marketId: string) {
    const [existing] = await this.db
      .select()
      .from(schema.market)
      .where(eq(schema.market.id, marketId));
    if (!existing) return null;

    const owner = existing.owner as { id: string };
    const invId = newId();
    const ts = nowIso();

    await this.db.insert(schema.inventory).values({
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

    await this.db.delete(schema.market).where(eq(schema.market.id, marketId));

    const payout = existing.price - (existing.discount ?? 0);
    await this.userService.score(owner.id, payout);

    broadcast("market", "delete", marketId);
    broadcast("inventory", "create", invId);
    return true;
  }

  async tradeInventory(
    currentUser: { id: string; money: number; items: string[] },
    otherUser: { id: string; money: number; items: string[] },
  ) {
    if (currentUser.money > 0) {
      await this.userService.score(otherUser.id, currentUser.money, true);
      await this.userService.score(currentUser.id, -currentUser.money, true);
    }
    if (currentUser.items.length > 0) {
      await this.db
        .update(schema.inventory)
        .set({ owner: otherUser.id, updated: nowIso() })
        .where(inArray(schema.inventory.id, currentUser.items));
      for (const itemId of currentUser.items) {
        broadcast("inventory", "update", itemId);
      }
    }

    if (otherUser.money > 0) {
      await this.userService.score(currentUser.id, otherUser.money, true);
      await this.userService.score(otherUser.id, -otherUser.money, true);
    }
    if (otherUser.items.length > 0) {
      await this.db
        .update(schema.inventory)
        .set({ owner: currentUser.id, updated: nowIso() })
        .where(inArray(schema.inventory.id, otherUser.items));
      for (const itemId of otherUser.items) {
        broadcast("inventory", "update", itemId);
      }
    }

    return true;
  }

  async discountMarket(
    marketId: string,
    ownerId: string,
    price: number,
    discountPrice: number,
  ) {
    await this.db
      .update(schema.market)
      .set({
        discount: discountPrice !== price ? discountPrice : null,
        updated: nowIso(),
      })
      .where(eq(schema.market.id, marketId));

    await this.userService.score(ownerId, price - discountPrice);
    broadcast("market", "update", marketId);
    return true;
  }

  async removeInventoryById(inventoryId: string) {
    await this.db
      .delete(schema.inventory)
      .where(eq(schema.inventory.id, inventoryId));
    broadcast("inventory", "delete", inventoryId);
  }

  async transferInventoryOwner(inventoryId: string, newOwnerId: string) {
    await this.db
      .update(schema.inventory)
      .set({ owner: newOwnerId, updated: nowIso() })
      .where(eq(schema.inventory.id, inventoryId));
    broadcast("inventory", "update", inventoryId);
  }

  async chargeInventory(
    inventoryId: string,
    oldCharge: number,
    newCharge: number,
  ) {
    const total = oldCharge + newCharge;
    if (total === 0) {
      await this.db
        .delete(schema.inventory)
        .where(eq(schema.inventory.id, inventoryId));
      broadcast("inventory", "delete", inventoryId);
      return null;
    }
    await this.db
      .update(schema.inventory)
      .set({ charge: total, updated: nowIso() })
      .where(eq(schema.inventory.id, inventoryId));
    broadcast("inventory", "update", inventoryId);
    const [row] = await this.db
      .select()
      .from(schema.inventory)
      .where(eq(schema.inventory.id, inventoryId));
    return row ? this.mapInventory(row) : null;
  }
}
