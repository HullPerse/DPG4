import { describe, expect, test, beforeEach } from "bun:test";
import { eq } from "drizzle-orm";
import {
  createTestDb,
  createServices,
  createUser,
  getUser,
} from "./helpers";
import * as schema from "@/db/schema.db";

describe("EconomyService.sellInventory", () => {
  let db: ReturnType<typeof createTestDb>["db"];
  let services: ReturnType<typeof createServices>;
  let userId: string;
  let inventoryId: string;

  beforeEach(async () => {
    const ctx = createTestDb();
    db = ctx.db;
    services = createServices(db);
    const user = await createUser(db, { money: 100 });
    userId = user.id;
    const ts = new Date().toISOString();
    const [inv] = await db
      .insert(schema.inventory)
      .values({
        id: "sell_test_inv",
        type: "item",
        owner: userId,
        label: "Продаваемый предмет",
        description: "Описание",
        charge: 0,
        created: ts,
        updated: ts,
      })
      .returning();
    inventoryId = inv.id;
  });

  test("creates market listing and deletes inventory", async () => {
    const result = await services.economyService.sellInventory(
      inventoryId,
      userId,
      50,
    );
    expect(result).not.toBeNull();
    expect(result!.price).toBe(50);
    const [marketRow] = await db
      .select()
      .from(schema.market)
      .where(eq(schema.market.originalId, inventoryId));
    expect(marketRow).not.toBeNull();
    expect(marketRow!.label).toBe("Продаваемый предмет");
    const [inv] = await db
      .select()
      .from(schema.inventory)
      .where(eq(schema.inventory.id, inventoryId));
    expect(inv).toBeUndefined();
  });

  test("returns null for zero price", async () => {
    const result = await services.economyService.sellInventory(
      inventoryId,
      userId,
      0,
    );
    expect(result).toBeNull();
  });

  test("returns null for invalid inventory", async () => {
    const result = await services.economyService.sellInventory(
      "nonexistent",
      userId,
      50,
    );
    expect(result).toBeNull();
  });
});

describe("EconomyService.buyMarket", () => {
  let db: ReturnType<typeof createTestDb>["db"];
  let services: ReturnType<typeof createServices>;
  let buyerId: string;
  let sellerId: string;
  let marketId: string;

  beforeEach(async () => {
    const ctx = createTestDb();
    db = ctx.db;
    services = createServices(db);
    const buyer = await createUser(db, { money: 200, username: "BUYER" });
    buyerId = buyer.id;
    const seller = await createUser(db, { money: 50, username: "SELLER" });
    sellerId = seller.id;
    const ts = new Date().toISOString();
    const [listing] = await db
      .insert(schema.market)
      .values({
        id: "buy_test_market",
        type: "item",
        originalId: "orig_inv",
        owner: { id: sellerId, username: "SELLER", avatar: "" } as Record<string, unknown>,
        label: "Продаваемый предмет",
        description: "Описание",
        charge: 0,
        price: 50,
        discount: null,
        created: ts,
        updated: ts,
      })
      .returning();
    marketId = listing.id;
  });

  test("transfers item to buyer and deducts money", async () => {
    const result = await services.economyService.buyMarket(
      marketId,
      buyerId,
      sellerId,
    );
    expect(result).toBe(true);
    const buyer = await getUser(db, buyerId);
    expect(buyer!.money).toBe(150);
    const seller = await getUser(db, sellerId);
    expect(seller!.money).toBe(100);
    const [inv] = await db
      .select()
      .from(schema.inventory)
      .where(eq(schema.inventory.owner, buyerId));
    expect(inv).not.toBeNull();
    expect(inv!.label).toBe("Продаваемый предмет");
  });

  test("returns null if buyer has insufficient funds", async () => {
    const poorBuyer = await createUser(db, { money: 10, username: "POOR" });
    const result = await services.economyService.buyMarket(
      marketId,
      poorBuyer.id,
      sellerId,
    );
    expect(result).toBeNull();
  });

  test("returns null for invalid market id", async () => {
    const result = await services.economyService.buyMarket(
      "nonexistent",
      buyerId,
      sellerId,
    );
    expect(result).toBeNull();
  });

  test("uses discount price when set", async () => {
    const ts = new Date().toISOString();
    const [discounted] = await db
      .insert(schema.market)
      .values({
        id: "discount_test_market",
        type: "item",
        originalId: "orig_inv_2",
        owner: { id: sellerId, username: "SELLER", avatar: "" } as Record<string, unknown>,
        label: "Со скидкой",
        description: "",
        charge: 0,
        price: 100,
        discount: 70,
        created: ts,
        updated: ts,
      })
      .returning();
    await services.economyService.buyMarket(
      discounted.id,
      buyerId,
      sellerId,
    );
    const buyer = await getUser(db, buyerId);
    expect(buyer!.money).toBe(130);
  });
});

describe("EconomyService.removeMarketListing", () => {
  let db: ReturnType<typeof createTestDb>["db"];
  let services: ReturnType<typeof createServices>;
  let userId: string;
  let marketId: string;

  beforeEach(async () => {
    const ctx = createTestDb();
    db = ctx.db;
    services = createServices(db);
    const user = await createUser(db, { money: 100 });
    userId = user.id;
    const ts = new Date().toISOString();
    const [listing] = await db
      .insert(schema.market)
      .values({
        id: "remove_test_market",
        type: "item",
        originalId: "orig_inv",
        owner: { id: userId, username: user.username, avatar: "" } as Record<string, unknown>,
        label: "Снимаемый предмет",
        description: "",
        charge: 0,
        price: 60,
        discount: 10,
        created: ts,
        updated: ts,
      })
      .returning();
    marketId = listing.id;
  });

  test("returns item to inventory and pays out price minus discount", async () => {
    const result = await services.economyService.removeMarketListing(marketId);
    expect(result).toBe(true);
    const user = await getUser(db, userId);
    expect(user!.money).toBe(150);
    const [inv] = await db
      .select()
      .from(schema.inventory)
      .where(eq(schema.inventory.owner, userId));
    expect(inv).not.toBeNull();
    expect(inv!.label).toBe("Снимаемый предмет");
    const [marketRow] = await db
      .select()
      .from(schema.market)
      .where(eq(schema.market.id, marketId));
    expect(marketRow).toBeUndefined();
  });

  test("returns null for invalid market id", async () => {
    const result = await services.economyService.removeMarketListing(
      "nonexistent",
    );
    expect(result).toBeNull();
  });
});

describe("EconomyService.discountMarket", () => {
  let db: ReturnType<typeof createTestDb>["db"];
  let services: ReturnType<typeof createServices>;
  let userId: string;
  let marketId: string;

  beforeEach(async () => {
    const ctx = createTestDb();
    db = ctx.db;
    services = createServices(db);
    const user = await createUser(db, { money: 100 });
    userId = user.id;
    const ts = new Date().toISOString();
    const [listing] = await db
      .insert(schema.market)
      .values({
        id: "discount_set_test",
        type: "item",
        originalId: "orig_inv",
        owner: { id: userId, username: user.username, avatar: "" } as Record<string, unknown>,
        label: "Дисконтируемый",
        description: "",
        charge: 0,
        price: 100,
        discount: null,
        created: ts,
        updated: ts,
      })
      .returning();
    marketId = listing.id;
  });

  test("sets discount and refunds difference", async () => {
    await services.economyService.discountMarket(marketId, userId, 100, 70);
    const user = await getUser(db, userId);
    expect(user!.money).toBe(130);
    const [marketRow] = await db
      .select()
      .from(schema.market)
      .where(eq(schema.market.id, marketId));
    expect(marketRow!.discount).toBe(70);
  });

  test("clears discount when price equals discount price", async () => {
    await services.economyService.discountMarket(marketId, userId, 100, 100);
    const [marketRow] = await db
      .select()
      .from(schema.market)
      .where(eq(schema.market.id, marketId));
    expect(marketRow!.discount).toBeNull();
  });
});

describe("EconomyService.tradeInventory", () => {
  let db: ReturnType<typeof createTestDb>["db"];
  let services: ReturnType<typeof createServices>;
  let userAId: string;
  let userBId: string;
  let itemAId: string;
  let itemBId: string;

  beforeEach(async () => {
    const ctx = createTestDb();
    db = ctx.db;
    services = createServices(db);
    const userA = await createUser(db, {
      money: 100,
      username: "USER_A",
    });
    userAId = userA.id;
    const userB = await createUser(db, {
      money: 50,
      username: "USER_B",
    });
    userBId = userB.id;
    const ts = new Date().toISOString();
    const [itemA] = await db
      .insert(schema.inventory)
      .values({
        id: "trade_item_a",
        type: "item",
        owner: userAId,
        label: "Предмет А",
        description: "",
        charge: 0,
        created: ts,
        updated: ts,
      })
      .returning();
    itemAId = itemA.id;
    const [itemB] = await db
      .insert(schema.inventory)
      .values({
        id: "trade_item_b",
        type: "item",
        owner: userBId,
        label: "Предмет Б",
        description: "",
        charge: 0,
        created: ts,
        updated: ts,
      })
      .returning();
    itemBId = itemB.id;
  });

  test("transfers money and items between users", async () => {
    await services.economyService.tradeInventory(
      { id: userAId, money: 30, items: [itemAId] },
      { id: userBId, money: 20, items: [itemBId] },
    );
    const userA = await getUser(db, userAId);
    expect(userA!.money).toBe(90);
    const userB = await getUser(db, userBId);
    expect(userB!.money).toBe(60);
    const [itemA] = await db
      .select()
      .from(schema.inventory)
      .where(eq(schema.inventory.id, itemAId));
    expect(itemA!.owner).toBe(userBId);
    const [itemB] = await db
      .select()
      .from(schema.inventory)
      .where(eq(schema.inventory.id, itemBId));
    expect(itemB!.owner).toBe(userAId);
  });

  test("handles trade with zero money and no items", async () => {
    const result = await services.economyService.tradeInventory(
      { id: userAId, money: 0, items: [] },
      { id: userBId, money: 0, items: [] },
    );
    expect(result).toBe(true);
    const userA = await getUser(db, userAId);
    expect(userA!.money).toBe(100);
    const userB = await getUser(db, userBId);
    expect(userB!.money).toBe(50);
  });
});
