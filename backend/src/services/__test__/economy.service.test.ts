import { describe, expect, test, beforeEach } from "bun:test";
import { eq } from "drizzle-orm";
import {
  createTestDb,
  createServices,
  createUser,
  getUser,
} from "./helpers";
import * as schema from "@/db/schema.db";

describe("EconomyService.addMoney", () => {
  let db: ReturnType<typeof createTestDb>["db"];
  let services: ReturnType<typeof createServices>;
  let userId: string;

  beforeEach(async () => {
    const ctx = createTestDb();
    db = ctx.db;
    services = createServices(db);
    const user = await createUser(db, { money: 100 });
    userId = user.id;
  });

  test("addMoney adds to user balance", async () => {
    await services.economyService.addMoney(userId, 50);
    const user = await getUser(db, userId);
    expect(user!.money).toBe(150);
  });

  test("addMoney with trade flag bypasses ephemerality", async () => {
    await services.userService.changeStatus(userId, "Эфемерность", "add");
    await services.economyService.addMoney(userId, 30, true);
    const user = await getUser(db, userId);
    expect(user!.money).toBe(130);
    expect(user!.status).toContain("Эфемерность");
  });

  test("addMoney creates audit log entry", async () => {
    await services.economyService.addMoney(userId, 50);
    const [log] = await db
      .select()
      .from(schema.inventoryLog)
      .where(eq(schema.inventoryLog.owner, userId));
    expect(log).not.toBeNull();
    expect(log!.action).toBe("money_add");
    expect(log!.details).toEqual({ amount: 50 });
  });
});

describe("EconomyService.removeMoney", () => {
  let db: ReturnType<typeof createTestDb>["db"];
  let services: ReturnType<typeof createServices>;
  let userId: string;

  beforeEach(async () => {
    const ctx = createTestDb();
    db = ctx.db;
    services = createServices(db);
    const user = await createUser(db, { money: 100 });
    userId = user.id;
  });

  test("removeMoney subtracts from user balance", async () => {
    await services.economyService.removeMoney(userId, 30);
    const user = await getUser(db, userId);
    expect(user!.money).toBe(70);
  });

  test("removeMoney with trade flag bypasses ephemerality", async () => {
    await services.userService.changeStatus(userId, "Эфемерность", "add");
    await services.economyService.removeMoney(userId, 30, true);
    const user = await getUser(db, userId);
    expect(user!.money).toBe(70);
    expect(user!.status).toContain("Эфемерность");
  });

  test("removeMoney creates audit log entry", async () => {
    await services.economyService.removeMoney(userId, 25);
    const [log] = await db
      .select()
      .from(schema.inventoryLog)
      .where(eq(schema.inventoryLog.owner, userId));
    expect(log).not.toBeNull();
    expect(log!.action).toBe("money_remove");
    expect(log!.details).toEqual({ amount: 25 });
  });
});

describe("EconomyService.deductTickets", () => {
  let db: ReturnType<typeof createTestDb>["db"];
  let services: ReturnType<typeof createServices>;
  let userId: string;

  beforeEach(async () => {
    const ctx = createTestDb();
    db = ctx.db;
    services = createServices(db);
    const user = await createUser(db, { money: 100 });
    userId = user.id;
  });

  test("deductTickets reduces ticket count", async () => {
    await services.economyService.deductTickets(userId, 30);
    const user = await getUser(db, userId);
    expect(user!.tickets).toBe(70);
  });

  test("deductTickets can reduce to zero", async () => {
    await services.economyService.deductTickets(userId, 100);
    const user = await getUser(db, userId);
    expect(user!.tickets).toBe(0);
  });

  test("deductTickets can go negative", async () => {
    await services.economyService.deductTickets(userId, 150);
    const user = await getUser(db, userId);
    expect(user!.tickets).toBe(-50);
  });
});

describe("EconomyService.addTickets", () => {
  let db: ReturnType<typeof createTestDb>["db"];
  let services: ReturnType<typeof createServices>;
  let userId: string;

  beforeEach(async () => {
    const ctx = createTestDb();
    db = ctx.db;
    services = createServices(db);
    const user = await createUser(db, { money: 100 });
    userId = user.id;
  });

  test("addTickets increases ticket count", async () => {
    await services.economyService.addTickets(userId, 50);
    const user = await getUser(db, userId);
    expect(user!.tickets).toBe(150);
  });

  test("addTickets with zero does nothing", async () => {
    await services.economyService.addTickets(userId, 0);
    const user = await getUser(db, userId);
    expect(user!.tickets).toBe(100);
  });
});

describe("EconomyService.addInventory", () => {
  let db: ReturnType<typeof createTestDb>["db"];
  let services: ReturnType<typeof createServices>;
  let userId: string;
  let itemId: string;

  beforeEach(async () => {
    const ctx = createTestDb();
    db = ctx.db;
    services = createServices(db);
    const user = await createUser(db);
    userId = user.id;
    const ts = new Date().toISOString();
    const [item] = await db
      .insert(schema.items)
      .values({
        id: "test_item_1",
        type: "item",
        label: "Тестовый предмет",
        description: "Тест",
        charge: 0,
        created: ts,
        updated: ts,
      })
      .returning();
    itemId = item.id;
  });

  test("addInventory creates inventory entry", async () => {
    const result = await services.economyService.addInventory(userId, itemId);
    expect(result).toBe(true);
    const [inv] = await db
      .select()
      .from(schema.inventory)
      .where(eq(schema.inventory.owner, userId));
    expect(inv).not.toBeNull();
    expect(inv!.label).toBe("Тестовый предмет");
    expect(inv!.owner).toBe(userId);
  });

  test("addInventory with unknown itemId returns null", async () => {
    const result = await services.economyService.addInventory(
      userId,
      "nonexistent",
    );
    expect(result).toBeNull();
  });

  test("addInventory with unknown userId returns null", async () => {
    const result = await services.economyService.addInventory(
      "nonexistent",
      itemId,
    );
    expect(result).toBeNull();
  });

  test("addInventory creates inventory log entry", async () => {
    await services.economyService.addInventory(userId, itemId);
    const [log] = await db
      .select()
      .from(schema.inventoryLog)
      .where(eq(schema.inventoryLog.owner, userId));
    expect(log).not.toBeNull();
    expect(log!.action).toBe("receive");
    expect(log!.itemLabel).toBe("Тестовый предмет");
  });
});

describe("EconomyService.removeInventoryById", () => {
  let db: ReturnType<typeof createTestDb>["db"];
  let services: ReturnType<typeof createServices>;
  let userId: string;
  let inventoryId: string;

  beforeEach(async () => {
    const ctx = createTestDb();
    db = ctx.db;
    services = createServices(db);
    const user = await createUser(db);
    userId = user.id;
    const ts = new Date().toISOString();
    const [inv] = await db
      .insert(schema.inventory)
      .values({
        id: "test_inv_1",
        type: "item",
        owner: userId,
        label: "Тестовый инвентарь",
        description: "",
        charge: 5,
        created: ts,
        updated: ts,
      })
      .returning();
    inventoryId = inv.id;
  });

  test("removeInventoryById deletes the entry", async () => {
    await services.economyService.removeInventoryById(inventoryId);
    const [inv] = await db
      .select()
      .from(schema.inventory)
      .where(eq(schema.inventory.id, inventoryId));
    expect(inv).toBeUndefined();
  });

  test("removeInventoryById logs deletion", async () => {
    await services.economyService.removeInventoryById(inventoryId);
    const [log] = await db
      .select()
      .from(schema.inventoryLog)
      .where(eq(schema.inventoryLog.inventoryId, inventoryId));
    expect(log).not.toBeNull();
    expect(log!.action).toBe("delete");
  });
});

describe("EconomyService.chargeInventory", () => {
  let db: ReturnType<typeof createTestDb>["db"];
  let services: ReturnType<typeof createServices>;
  let userId: string;
  let inventoryId: string;

  beforeEach(async () => {
    const ctx = createTestDb();
    db = ctx.db;
    services = createServices(db);
    const user = await createUser(db);
    userId = user.id;
    const ts = new Date().toISOString();
    const [inv] = await db
      .insert(schema.inventory)
      .values({
        id: "test_charge_1",
        type: "item",
        owner: userId,
        label: "Заряжаемый предмет",
        description: "",
        charge: 10,
        created: ts,
        updated: ts,
      })
      .returning();
    inventoryId = inv.id;
  });

  test("chargeInventory adds charge", async () => {
    await services.economyService.chargeInventory(inventoryId, 10, 5);
    const [inv] = await db
      .select()
      .from(schema.inventory)
      .where(eq(schema.inventory.id, inventoryId));
    expect(inv!.charge).toBe(15);
  });

  test("chargeInventory with total zero deletes the entry", async () => {
    const result = await services.economyService.chargeInventory(
      inventoryId,
      10,
      -10,
    );
    expect(result).toBeNull();
    const [inv] = await db
      .select()
      .from(schema.inventory)
      .where(eq(schema.inventory.id, inventoryId));
    expect(inv).toBeUndefined();
  });

  test("chargeInventory logs charge change", async () => {
    await services.economyService.chargeInventory(inventoryId, 10, -3);
    const [log] = await db
      .select()
      .from(schema.inventoryLog)
      .where(eq(schema.inventoryLog.inventoryId, inventoryId));
    expect(log).not.toBeNull();
    expect(log!.action).toBe("charge_change");
  });
});
