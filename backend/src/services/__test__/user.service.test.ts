import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import {
  createTestDb,
  createServices,
  createUser,
  getUser,
  seedRandom,
  resetRandom,
} from "./helpers";

describe("UserService.score", () => {
  let db: ReturnType<typeof createTestDb>["db"];
  let services: ReturnType<typeof createServices>;
  let userId: string;

  beforeEach(async () => {
    const ctx = createTestDb();
    db = ctx.db;
    services = createServices(db);
    const user = await createUser(db, { money: 100 });
    userId = user.id;
    seedRandom([]);
  });

  afterEach(() => {
    resetRandom();
  });

  test("positive score adds money", async () => {
    await services.userService.score(userId, 50);
    const user = await getUser(db, userId);
    expect(user!.money).toBe(150);
  });

  test("negative score subtracts money", async () => {
    await services.userService.score(userId, -30);
    const user = await getUser(db, userId);
    expect(user!.money).toBe(70);
  });

  test("zero score does nothing", async () => {
    await services.userService.score(userId, 0);
    const user = await getUser(db, userId);
    expect(user!.money).toBe(100);
  });

  test("score can reduce to zero", async () => {
    await services.userService.score(userId, -100);
    const user = await getUser(db, userId);
    expect(user!.money).toBe(0);
  });

  test("score can go negative", async () => {
    await services.userService.score(userId, -200);
    const user = await getUser(db, userId);
    expect(user!.money).toBe(-100);
  });

  test("blessing doubles positive score and consumes one blessing", async () => {
    await services.userService.changeStatus(
      userId,
      "Благословление цыганского барона",
      "add",
    );
    await services.userService.score(userId, 20);
    const user = await getUser(db, userId);
    expect(user!.money).toBe(140);
    expect(user!.status).not.toContain("Благословление цыганского барона");
  });

  test("multiple blessings multiply by 2^n", async () => {
    await services.userService.changeStatus(
      userId,
      "Благословление цыганского барона",
      "add",
    );
    await services.userService.changeStatus(
      userId,
      "Благословление цыганского барона",
      "add",
    );
    await services.userService.changeStatus(
      userId,
      "Благословление цыганского барона",
      "add",
    );
    await services.userService.score(userId, 10);
    const user = await getUser(db, userId);
    expect(user!.money).toBe(180);
  });

  test("blessing does not apply to negative score", async () => {
    await services.userService.changeStatus(
      userId,
      "Благословление цыганского барона",
      "add",
    );
    await services.userService.score(userId, -20);
    const user = await getUser(db, userId);
    expect(user!.money).toBe(80);
    expect(user!.status).toContain("Благословление цыганского барона");
  });

  test("ephemerality with Math.random < 0.5 gives win, keeps status", async () => {
    await services.userService.changeStatus(userId, "Эфемерность", "add");
    seedRandom([0.2]);
    await services.userService.score(userId, 30);
    const user = await getUser(db, userId);
    expect(user!.money).toBe(130);
    expect(user!.status).toContain("Эфемерность");
  });

  test("ephemerality with Math.random >= 0.5 forfeits win, removes status", async () => {
    await services.userService.changeStatus(userId, "Эфемерность", "add");
    seedRandom([0.7]);
    await services.userService.score(userId, 30);
    const user = await getUser(db, userId);
    expect(user!.money).toBe(100);
    expect(user!.status).not.toContain("Эфемерность");
  });

  test("ephemerality does not affect trade", async () => {
    await services.userService.changeStatus(userId, "Эфемерность", "add");
    await services.userService.score(userId, 30, true);
    const user = await getUser(db, userId);
    expect(user!.money).toBe(130);
    expect(user!.status).toContain("Эфемерность");
  });

  test("ephemerality does not affect negative score", async () => {
    await services.userService.changeStatus(userId, "Эфемерность", "add");
    await services.userService.score(userId, -10);
    const user = await getUser(db, userId);
    expect(user!.money).toBe(90);
    expect(user!.status).toContain("Эфемерность");
  });

  test("changeStatus adds status", async () => {
    await services.userService.changeStatus(userId, "Тестовый_статус", "add");
    const user = await getUser(db, userId);
    expect(user!.status).toContain("Тестовый_статус");
  });

  test("changeStatus removes status", async () => {
    await services.userService.changeStatus(userId, "Тестовый_статус", "add");
    await services.userService.changeStatus(
      userId,
      "Тестовый_статус",
      "remove",
    );
    const user = await getUser(db, userId);
    expect(user!.status).not.toContain("Тестовый_статус");
  });

  test("getById returns user without password", async () => {
    const user = await services.userService.getById(userId);
    expect(user).not.toBeNull();
    expect(user).not.toHaveProperty("passwordHash");
    expect(user!.username).toBeDefined();
  });

  test("getById returns null for unknown user", async () => {
    const user = await services.userService.getById("nonexistent");
    expect(user).toBeNull();
  });
});
