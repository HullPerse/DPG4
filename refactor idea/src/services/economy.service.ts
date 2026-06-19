import { eq, inArray } from "drizzle-orm";
import * as schema from "@/db/schema.db";

import { Db } from "@/types/server";
import ActivityService from "./activity.service";
import UserService from "./user.service";
import LogService from "./log.service";
import {
  ACTIVITY_TYPES,
  newId,
  nowIso,
  withRecordMeta,
} from "@/lib/index.utils";
import { broadcast } from "@/lib/websocket.utils";
import { rawDb } from "@/db/index.db";

export default class EconomyService {
  constructor(
    private db: Db,
    private userService: UserService,
    private activityService: ActivityService,
    private inventoryLogService: LogService,
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

  async addInventory(
    userId: string,
    itemId: string,
    action: "receive" | "grant" = "receive",
  ) {
    const [item] = await this.db
      .select()
      .from(schema.items)
      .where(eq(schema.items.id, itemId));
    if (!item) return null;

    const user = await this.userService.getById(userId);
    if (!user) return null;

    if (item.type === "effect") {
      await this.userService.changeStatus(userId, item.label, "add");
      await this.inventoryLogService.logFromData(
        action,
        "",
        item.label,
        item.type,
        userId,
        userId,
        { fromItem: itemId, isEffect: true },
      );
    } else {
      const invId = await this.copyInventoryFromItem(item, userId);
      await this.inventoryLogService.logFromData(
        action,
        invId,
        item.label,
        item.type,
        userId,
        userId,
        { fromItem: itemId },
      );
    }

    await this.activityService.create({
      author: userId,
      image: user.avatar,
      type: ACTIVITY_TYPES.EMOJI,
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

    await this.inventoryLogService.log(
      "market_list",
      inventoryId,
      ownerId,
      ownerId,
      { price },
    );

    await this.db
      .delete(schema.inventory)
      .where(eq(schema.inventory.id, inventoryId));

    await this.activityService.create({
      author: ownerId,
      image: user.avatar,
      type: ACTIVITY_TYPES.EMOJI,
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

    const cost = itemData.discount ? itemData.discount : itemData.price;

    const invId = newId();
    const ts = nowIso();
    const execute = () => {
      rawDb.run("BEGIN");
      try {
        this.db.insert(schema.inventory).values({
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
        this.db.delete(schema.market).where(eq(schema.market.id, marketId));
        rawDb.run("COMMIT");
      } catch {
        rawDb.run("ROLLBACK");
        throw new Error("buy transaction failed");
      }
    };
    execute();

    await this.userService.score(newOwnerId, -cost, true);
    await this.userService.score(oldOwnerId, cost, true);

    await this.inventoryLogService.logFromData(
      "buy",
      invId,
      itemData.label,
      itemData.type,
      newOwnerId,
      newOwnerId,
      { price: itemData.price, discount: itemData.discount, marketId },
    );
    await this.inventoryLogService.logFromData(
      "sell",
      itemData.originalId ?? "",
      itemData.label,
      itemData.type,
      oldOwnerId,
      newOwnerId,
      { price: itemData.price, discount: itemData.discount, marketId },
    );

    await this.activityService.create({
      author: newOwnerId,
      image: buyer.avatar,
      type: ACTIVITY_TYPES.EMOJI,
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

    await this.inventoryLogService.logFromData(
      "market_unlist",
      existing.originalId ?? "",
      existing.label,
      existing.type,
      owner.id,
      owner.id,
      { marketId },
    );

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
      const items = await this.db
        .select()
        .from(schema.inventory)
        .where(inArray(schema.inventory.id, currentUser.items));
      await this.db
        .update(schema.inventory)
        .set({ owner: otherUser.id, updated: nowIso() })
        .where(inArray(schema.inventory.id, currentUser.items));
      for (const item of items) {
        broadcast("inventory", "update", item.id);
        await this.inventoryLogService.log(
          "trade_out",
          item.id,
          currentUser.id,
          currentUser.id,
          { toUser: otherUser.id },
        );
      }
    }

    if (otherUser.money > 0) {
      await this.userService.score(currentUser.id, otherUser.money, true);
      await this.userService.score(otherUser.id, -otherUser.money, true);
    }
    if (otherUser.items.length > 0) {
      const items = await this.db
        .select()
        .from(schema.inventory)
        .where(inArray(schema.inventory.id, otherUser.items));
      await this.db
        .update(schema.inventory)
        .set({ owner: currentUser.id, updated: nowIso() })
        .where(inArray(schema.inventory.id, otherUser.items));
      for (const item of items) {
        broadcast("inventory", "update", item.id);
        await this.inventoryLogService.log(
          "trade_in",
          item.id,
          currentUser.id,
          currentUser.id,
          { fromUser: otherUser.id },
        );
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
    const [inv] = await this.db
      .select()
      .from(schema.inventory)
      .where(eq(schema.inventory.id, inventoryId));
    await this.db
      .delete(schema.inventory)
      .where(eq(schema.inventory.id, inventoryId));
    if (inv) {
      await this.inventoryLogService.logFromData(
        "delete",
        inv.id,
        inv.label,
        inv.type,
        inv.owner,
        undefined,
      );
    }
    broadcast("inventory", "delete", inventoryId);
  }

  async transferInventoryOwner(inventoryId: string, newOwnerId: string) {
    const [inv] = await this.db
      .select()
      .from(schema.inventory)
      .where(eq(schema.inventory.id, inventoryId));
    await this.db
      .update(schema.inventory)
      .set({ owner: newOwnerId, updated: nowIso() })
      .where(eq(schema.inventory.id, inventoryId));
    if (inv) {
      await this.inventoryLogService.log(
        "send",
        inventoryId,
        inv.owner,
        undefined,
        { toUser: newOwnerId },
      );
      await this.inventoryLogService.logFromData(
        "receive",
        inventoryId,
        inv.label,
        inv.type,
        newOwnerId,
        undefined,
        { fromUser: inv.owner },
      );
    }
    broadcast("inventory", "update", inventoryId);
  }

  async chargeInventory(
    inventoryId: string,
    oldCharge: number,
    newCharge: number,
  ) {
    const total = oldCharge + newCharge;
    if (total === 0) {
      const [inv] = await this.db
        .select()
        .from(schema.inventory)
        .where(eq(schema.inventory.id, inventoryId));
      await this.db
        .delete(schema.inventory)
        .where(eq(schema.inventory.id, inventoryId));
      if (inv) {
        await this.inventoryLogService.logFromData(
          "delete",
          inv.id,
          inv.label,
          inv.type,
          inv.owner,
          undefined,
          { reason: "charge_depleted", oldCharge, newCharge },
        );
      }
      broadcast("inventory", "delete", inventoryId);
      return null;
    }
    await this.db
      .update(schema.inventory)
      .set({ charge: total, updated: nowIso() })
      .where(eq(schema.inventory.id, inventoryId));
    const [row] = await this.db
      .select()
      .from(schema.inventory)
      .where(eq(schema.inventory.id, inventoryId));
    if (row) {
      await this.inventoryLogService.log(
        "charge_change",
        inventoryId,
        row.owner,
        undefined,
        { oldCharge, newCharge, total },
      );
    }
    broadcast("inventory", "update", inventoryId);
    return row ? this.mapInventory(row) : null;
  }
}
