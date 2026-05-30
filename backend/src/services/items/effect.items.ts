import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import * as schema from "@/db/schema";
import {
  getFirstCellInNextRow,
  getGridPosition,
  getLastCellInRow,
} from "@/lib/cell.utils";
import { nowIso } from "@/lib/dates";
import { broadcast } from "@/lib/ws";
import {
  GREMLIN_IDS,
  ITEM_DB_IDS,
  ITEM_MODAL_LABELS,
  RAT_IDS,
} from "@/items/constants";
import { createActivity } from "@/services/activity.service";
import {
  addInventory,
  chargeInventory,
  removeInventoryById,
  transferInventoryOwner,
} from "@/services/economy.service";
import {
  dropUserPlayingGame,
  getLastGameForUser,
  rerollUserLastGame,
} from "@/services/game.service";
import {
  changeUserStatus,
  getUserById,
  scoreUser,
} from "@/services/user.service";

type Db = BunSQLiteDatabase<typeof schema>;

type EffectCtx = {
  db: Db;
  userId: string;
  inventoryId: string;
  label: string;
};

type EffectHandler = (ctx: EffectCtx) => Promise<string | null>;

async function getUser(db: Db, userId: string) {
  const user = await getUserById(db, userId);
  if (!user) throw new Error("User not found");
  return user;
}

async function consume(
  db: Db,
  ctx: EffectCtx,
  activityText: string,
  skipCharge = false,
) {
  const user = await getUser(db, ctx.userId);
  if (!skipCharge) {
    const [inv] = await db
      .select()
      .from(schema.inventory)
      .where(eq(schema.inventory.id, ctx.inventoryId));
    if (!inv) throw new Error("Inventory not found");
    await chargeInventory(db, ctx.inventoryId, inv.charge, -1);
  }
  await createActivity(db, {
    author: ctx.userId,
    image: user.avatar,
    text: activityText,
  });
}

async function getCellByNumber(db: Db, number: number) {
  const [row] = await db
    .select()
    .from(schema.cells)
    .where(eq(schema.cells.number, number));
  return row ?? null;
}

async function patchCellStatus(db: Db, cellId: string, status: string[]) {
  await db
    .update(schema.cells)
    .set({ status, updated: nowIso() })
    .where(eq(schema.cells.id, cellId));
  broadcast("cells", "update", cellId);
}

async function patchUser(
  db: Db,
  userId: string,
  patch: Partial<typeof schema.users.$inferInsert>,
) {
  await db
    .update(schema.users)
    .set({ ...patch, updated: nowIso() })
    .where(eq(schema.users.id, userId));
  broadcast("users", "update", userId);
}

const handlers: Record<string, EffectHandler> = {
  "Свиток реролла": async ({ db, userId }) => {
    const user = await getUser(db, userId);
    const game = await rerollUserLastGame(db, userId);
    if (!game) return null;
    const name = (game.data as { name?: string })?.name ?? "игру";
    return `${user.username} использовал свиток реролла на игре ${name}`;
  },

  "Гем Монтесумы": async ({ db, userId }) => {
    const user = await getUser(db, userId);
    return `${user.username} использовал Гем Монтесумы`;
  },

  "Кредит": async ({ db, userId }) => {
    const user = await getUser(db, userId);
    if (user.money < 15) return null;
    await scoreUser(db, userId, -15);
    await dropUserPlayingGame(db, userId);
    await patchUser(db, userId, { currentAction: "GAMEADD" });
    const game = await getLastGameForUser(db, userId);
    const name = (game?.data as { name?: string })?.name ?? "игру";
    return `${user.username} использовал Кредит на ${name}`;
  },

  "Erection - NPC": async ({ db, userId, inventoryId }) => {
    const [firstPosition] = await db
      .select()
      .from(schema.users)
      .orderBy(desc(schema.users.position))
      .limit(1);
    if (!firstPosition) return null;
    const targetInventory = await db
      .select()
      .from(schema.inventory)
      .where(eq(schema.inventory.owner, firstPosition.id));
    if (targetInventory.length === 0) return null;

    let itemAmount = 0;
    const pick = () =>
      targetInventory[Math.floor(Math.random() * targetInventory.length)]!;

    if (targetInventory.length >= 2) {
      await removeInventoryById(db, pick().id);
      itemAmount += 1;
    }
    await removeInventoryById(db, pick().id);
    itemAmount += 1;

    const [currentItem] = await db
      .select()
      .from(schema.inventory)
      .where(eq(schema.inventory.id, inventoryId));
    if (currentItem) {
      await chargeInventory(db, inventoryId, currentItem.charge, -1);
    }

    await createActivity(db, {
      author: userId,
      image: firstPosition.avatar,
      type: "emoji",
      text: `У ${firstPosition.username} пропало ${itemAmount} предмета из-за странной магии...`,
    });
    return null;
  },

  Арбуз: async ({ db, userId }) => {
    const user = await getUser(db, userId);
    const row = getGridPosition(user.position).row;
    const cell = getLastCellInRow(row);
    const action = user.currentAction === "GAMEADD" ? "GAMEFINISH" : "GAMEADD";
    await patchUser(db, userId, { position: cell, currentAction: action });
    return `${user.username} переместился на клетку ${cell}`;
  },

  Арбус: async ({ db, userId }) => {
    const user = await getUser(db, userId);
    const row = getGridPosition(user.position).row;
    const cell = getFirstCellInNextRow(row);
    const action = user.currentAction === "GAMEADD" ? "GAMEFINISH" : "GAMEADD";
    await patchUser(db, userId, { position: cell, currentAction: action });
    return `${user.username} переместился на клетку ${cell}`;
  },

  Кал: async ({ db, userId }) => {
    const user = await getUser(db, userId);
    const cell = await getCellByNumber(db, user.position);
    if (!cell) return null;
    await patchCellStatus(db, cell.id, [...(cell.status ?? []), "poop"]);
    return `${user.username} насрал на клетку ${cell.number}`;
  },

  "Легендарный кал": async ({ db, userId }) => {
    const user = await getUser(db, userId);
    const cell = await getCellByNumber(db, user.position);
    if (!cell) return null;
    await patchCellStatus(db, cell.id, [...(cell.status ?? []), "poop"]);
    return `${user.username} насрал на клетку ${cell.number}`;
  },

  Конфетка: async ({ db, userId }) => {
    const user = await getUser(db, userId);
    await scoreUser(db, userId, 1);
    return `${user.username} съел одну конфетку`;
  },

  "Лимонная конфетка": async ({ db, userId }) => {
    const user = await getUser(db, userId);
    await scoreUser(db, userId, 2);
    return `${user.username} съел одну лимонную конфетку`;
  },

  "Пакет конфеток": async ({ db, userId }) => {
    const user = await getUser(db, userId);
    await scoreUser(db, userId, 10);
    return `${user.username} съел целый пакет конфеток`;
  },

  "Пакет лимонных конфеток": async ({ db, userId }) => {
    const user = await getUser(db, userId);
    await scoreUser(db, userId, 15);
    return `${user.username} съел целый пакет лимонных конфеток`;
  },

  "Глюк матрицы": async ({ db, userId }) => {
    const user = await getUser(db, userId);
    const allItems = await db
      .select()
      .from(schema.inventory)
      .where(eq(schema.inventory.owner, userId));
    const filtered = allItems.filter((i) => i.label !== "Глюк матрицы");
    const finalItem = filtered[Math.floor(Math.random() * filtered.length)];
    if (!finalItem) return null;

    const [itemDB] = await db
      .select()
      .from(schema.items)
      .where(eq(schema.items.label, finalItem.label));
    if (!itemDB) return null;

    await addInventory(db, userId, itemDB.id);

    if (Math.random() * 100 <= 30) {
      await addInventory(db, userId, ITEM_DB_IDS.rat);
      await createActivity(db, {
        author: userId,
        image: user.avatar,
        type: "emoji",
        text: `${user.username} получил внезапную крысу`,
      });
    }

    return `${user.username} создал дубликат ${finalItem.label}`;
  },

  "Хрюкающая свинья": async ({ db, userId }) => {
    const user = await getUser(db, userId);
    const cell = await getCellByNumber(db, user.position);
    if (!cell) return null;
    await patchCellStatus(db, cell.id, [...(cell.status ?? []), "pig"]);
    return `${user.username} подложил свинью на клетку ${cell.number}`;
  },

  "Тупорылый кот": async ({ db, userId }) => {
    const user = await getUser(db, userId);
    const cell = await getCellByNumber(db, user.position);
    if (!cell) return null;
    await patchCellStatus(db, cell.id, [...(cell.status ?? []), "cat"]);
    return `${user.username} потерял кота на клетке ${cell.number}`;
  },

  Вакуум: async ({ db, userId }) => {
    const user = await getUser(db, userId);
    const allUsers = await db.select().from(schema.users);
    const nearbyIds = allUsers
      .filter(
        (other) =>
          other.id !== userId && Math.abs(user.position - other.position) <= 5,
      )
      .map((u) => u.id);
    if (nearbyIds.length > 0) {
      const allNearbyInventory = await db
        .select()
        .from(schema.inventory)
        .where(inArray(schema.inventory.owner, nearbyIds));
      const usedIds: string[] = [];
      for (const other of allUsers) {
        if (!nearbyIds.includes(other.id)) continue;
        const inv = allNearbyInventory.filter((i) => i.owner === other.id);
        if (!inv.length) continue;
        const item = inv[Math.floor(Math.random() * inv.length)]!;
        usedIds.push(item.id);
      }
      for (const id of usedIds) {
        await transferInventoryOwner(db, id, userId);
      }
    }
    return `${user.username} всосал несколько предметов`;
  },

  "Налоговый инспектор": async ({ db, userId }) => {
    const user = await getUser(db, userId);
    const allUsers = await db
      .select()
      .from(schema.users)
      .then((res) => res.filter((u) => u.position !== 0));

    for (const other of allUsers) {
      if (other.position === 0) continue;
      const [cell] = await db
        .select()
        .from(schema.cells)
        .where(eq(schema.cells.number, other.position));
      if (!cell?.captured?.includes(other.id)) continue;
      const finalValue = other.money >= 10 ? 10 : other.money;
      await scoreUser(db, userId, finalValue);
      await scoreUser(db, other.id, -finalValue);
    }
    return `${user.username} своровал бабки у бабки`;
  },

  Ведро: async ({ db, userId }) => {
    const user = await getUser(db, userId);
    const allUsers = await db
      .select()
      .from(schema.users)
      .then((res) =>
        res
          .filter((u) => u.id !== userId)
          .map((u) => ({
            user: u,
            distance: Math.abs(u.position - user.position),
          })),
      );
    if (!allUsers.length) return null;

    const minDistance = Math.min(...allUsers.map((d) => d.distance));
    const closestPool = allUsers.filter((d) => d.distance === minDistance);
    const closest =
      closestPool[Math.floor(Math.random() * closestPool.length)]!;

    const itemIds = [
      ITEM_DB_IDS.bucket1,
      ITEM_DB_IDS.bucket2,
      ITEM_DB_IDS.bucket3,
    ];
    const finalItemId = itemIds[Math.floor(Math.random() * itemIds.length)]!;
    const [itemData] = await db
      .select()
      .from(schema.items)
      .where(eq(schema.items.id, finalItemId));
    if (!itemData) return null;

    await addInventory(db, userId, itemData.id);
    return `${user.username} подоил игрока ${closest.user.username} и получил ${itemData.label}`;
  },

  "Ведро с Польпо": async ({ db, userId }) => {
    const user = await getUser(db, userId);
    const finalMoney = Math.random() < 0.5 ? 10 : -10;
    await scoreUser(db, userId, finalMoney);
    return `${user.username} ${finalMoney > 0 ? "получил" : "потерял"} 10 чубриков из-за Польпо`;
  },

  Страховка: async ({ db, userId }) => {
    const user = await getUser(db, userId);
    const game = await rerollUserLastGame(db, userId);
    if (!game) return null;
    const name = (game.data as { name?: string })?.name ?? "игру";
    return `${user.username} рерольнул ${name} по страховке`;
  },

  "Стул Трампа": async ({ db, userId }) => {
    const user = await getUser(db, userId);
    const cell = await getCellByNumber(db, user.position);
    if (!cell) return null;
    await patchCellStatus(db, cell.id, [...(cell.status ?? []), "chair"]);
    return `${user.username} выкинул стул на клетку ${cell.number}`;
  },

  "Минус 8 чубриков": async ({ db, userId }) => {
    const user = await getUser(db, userId);
    await scoreUser(db, userId, -1);
    return `${user.username} обманули, и н потерял 1 чубрик`;
  },

  "Курва бобер": async ({ db, userId }) => {
    const user = await getUser(db, userId);
    const newPosition = Math.max(0, user.position - 4);
    await patchUser(db, userId, { position: newPosition });
    return `${user.username} погнался на Курва Бобром и переместился на клетку ${newPosition}`;
  },

  "Крыса Изгой": async ({ db, userId }) => {
    const user = await getUser(db, userId);
    const [finalItem] = await db
      .select()
      .from(schema.inventory)
      .where(
        sql`${schema.inventory.owner} != ${userId} AND ${schema.inventory.label} != 'Крыса Изгой'`,
      )
      .orderBy(sql`RANDOM()`)
      .limit(1);
    if (!finalItem) return null;

    const [currentItem] = await db
      .select()
      .from(schema.inventory)
      .where(eq(schema.inventory.owner, userId))
      .orderBy(sql`RANDOM()`)
      .limit(1);
    if (!currentItem) return null;

    await transferInventoryOwner(db, finalItem.id, userId);
    await transferInventoryOwner(db, currentItem.id, finalItem.owner);
    return `${user.username} украл ${finalItem.label}`;
  },

  "Добрая крыса": async ({ db, userId }) => {
    const user = await getUser(db, userId);
    const allItems = await db
      .select()
      .from(schema.inventory)
      .then((res) =>
        res.filter((i) => i.owner !== userId && i.label !== "Добрая крыса"),
      );
    const targetIds = [...new Set(allItems.map((i) => i.owner))];
    if (!targetIds.length) return null;

    const targetId = targetIds[Math.floor(Math.random() * targetIds.length)]!;
    const targetInventory = allItems.filter((i) => i.owner === targetId);
    const shuffled = [...targetInventory].sort(() => Math.random() - 0.5);
    const halfCount = Math.floor(shuffled.length / 2);
    const ids = shuffled.slice(0, halfCount).map((i) => i.id);

    if (ids.length > 0) {
      await db
        .update(schema.inventory)
        .set({ owner: userId, updated: nowIso() })
        .where(inArray(schema.inventory.id, ids));
      for (const id of ids) {
        broadcast("inventory", "update", id);
      }
    }

    const targetUser = await getUserById(db, targetId);
    return `${user.username} украл половину инвентаря ${targetUser?.username ?? "игрока"}`;
  },

  "Запаянный Крысиный Сундук": async ({ db, userId }) => {
    for (let i = 0; i < 5; i++) {
      await addInventory(db, userId, ITEM_DB_IDS.chestRats);
    }
    return `ААА КРЫСЫ ВЫПОЛЗАЮТ ИЗ СУНДУКА`;
  },

  "Крыса наркоманка": async ({ db, userId }) => {
    const user = await getUser(db, userId);
    const [finalItem] = await db
      .select()
      .from(schema.inventory)
      .where(
        sql`${schema.inventory.label} != 'Крыса наркоманка' AND ${schema.inventory.owner} != ${userId}`,
      )
      .orderBy(sql`RANDOM()`)
      .limit(1);
    if (!finalItem) return null;

    await transferInventoryOwner(db, finalItem.id, userId);
    await addInventory(db, finalItem.owner, ITEM_DB_IDS.poop);
    await scoreUser(db, userId, 10);
    return `${user.username} украл и насрал`;
  },

  "Крысиный тапок": async ({ db, userId, inventoryId }) => {
    const user = await getUser(db, userId);
    const [finalItem] = await db
      .select()
      .from(schema.inventory)
      .where(
        and(
          eq(schema.inventory.owner, userId),
          sql`${schema.inventory.label} != 'Крысиный тапок'`,
        ),
      )
      .orderBy(sql`RANDOM()`)
      .limit(1);
    if (!finalItem) return null;

    await removeInventoryById(db, finalItem.id);
    await changeUserStatus(db, userId, "Крысиный тапок", "add");
    const [inv] = await db
      .select()
      .from(schema.inventory)
      .where(eq(schema.inventory.id, inventoryId));
    if (inv) await chargeInventory(db, inventoryId, inv.charge, -1);
    return `${user.username} потреля ${finalItem.label}, но получил доп. кубик`;
  },

  "Крыса гой": async ({ db, userId }) => {
    const user = await getUser(db, userId);
    const [finalItem] = await db
      .select()
      .from(schema.inventory)
      .where(sql`${schema.inventory.owner} != ${userId}`)
      .orderBy(sql`RANDOM()`)
      .limit(1);
    if (!finalItem) return null;

    await transferInventoryOwner(db, finalItem.id, userId);
    const finalMoney = user.money > 0 ? -user.money : -4;
    await scoreUser(db, userId, finalMoney);
    return `У ${user.username} выпали из кармана все чубрики, пока он воровал ${finalItem.label}`;
  },

  "Алтарь обновления": async ({ db, userId }) => {
    const user = await getUser(db, userId);
    const allItems = await db
      .select()
      .from(schema.inventory)
      .where(eq(schema.inventory.owner, userId));
    for (const item of allItems) {
      await removeInventoryById(db, item.id);
    }
    return `${user.username} принес в жертву ${allItems.length} предметов`;
  },

  Апельсин: async ({ db, userId }) => {
    const user = await getUser(db, userId);
    await scoreUser(db, userId, 2);
    await patchUser(db, userId, {
      position: user.position + 1,
      currentAction: "GAMEADD",
    });
    return `${user.username} съел вкусный апельсин`;
  },

  "Ебануто живучая свинья": async ({ db, userId }) => {
    const user = await getUser(db, userId);
    const allUsers = await db
      .select()
      .from(schema.users)
      .then((res) => res.filter((u) => u.id !== userId));
    const statuses = user.status ?? [];
    if (!statuses.length || !allUsers.length) return null;

    const finalStatus = statuses[Math.floor(Math.random() * statuses.length)]!;
    const finalUser = allUsers[Math.floor(Math.random() * allUsers.length)]!;
    await changeUserStatus(db, userId, finalStatus, "remove");
    await changeUserStatus(db, finalUser.id, finalStatus, "add");
    return `${user.username} отправил эффект ${finalStatus} ${finalUser.username}`;
  },

  "Зелье Крысогеддона": async ({ db, userId }) => {
    const user = await getUser(db, userId);
    const pool = await db
      .select()
      .from(schema.users)
      .then((res) =>
        res.filter((u) => u.status && u.status.length > 0 && u.id !== userId),
      );
    const finalUser = pool[Math.floor(Math.random() * pool.length)];
    if (!finalUser?.status?.length) return null;

    const finalStatus =
      finalUser.status[Math.floor(Math.random() * finalUser.status.length)]!;
    const finalItem = Math.random() < 0.3 ? ITEM_DB_IDS.poop : ITEM_DB_IDS.rat;

    await changeUserStatus(db, finalUser.id, finalStatus, "remove");
    await addInventory(db, finalUser.id, finalItem);
    const itemName = finalItem === ITEM_DB_IDS.rat ? "крысу" : "кал";
    return `${user.username} превратил ${finalUser.username}: ${finalStatus} в ${itemName}`;
  },

  "Крысиная раздача": async ({ db, userId }) => {
    const user = await getUser(db, userId);
    const allUsers = await db.select().from(schema.users);
    for (const u of allUsers) {
      await addInventory(db, u.id, ITEM_DB_IDS.rat);
    }
    return `${user.username} выдал ВСЕМ по крысе`;
  },

  Крысавчик: async ({ db, userId }) => {
    const user = await getUser(db, userId);
    const inventory = await db
      .select()
      .from(schema.inventory)
      .where(eq(schema.inventory.owner, userId));
    const rats = inventory.filter((i) => RAT_IDS.includes(i.label));

    if (rats.length === 0) {
      await scoreUser(db, userId, -2);
      return `${user.username} потерял 2 чубрика из-за отсутствия крыс`;
    }
    await scoreUser(db, userId, rats.length);
    return `${user.username} получил ${rats.length} чубриков из-за крыс`;
  },

  Свинство: async ({ db, userId }) => {
    const user = await getUser(db, userId);
    const inventory = await db
      .select()
      .from(schema.inventory)
      .where(eq(schema.inventory.owner, userId));
    const allUsers = await db
      .select()
      .from(schema.users)
      .then((res) => res.filter((u) => u.id !== userId));

    const half = Math.ceil(inventory.length / 2);
    const itemsToGive = inventory.slice(0, half);
    const ts = nowIso();
    for (let i = 0; i < itemsToGive.length; i++) {
      const targetUser = allUsers[i % allUsers.length];
      if (!targetUser) continue;
      await db
        .update(schema.inventory)
        .set({ owner: targetUser.id, updated: ts })
        .where(eq(schema.inventory.id, itemsToGive[i]!.id));
      broadcast("inventory", "update", itemsToGive[i]!.id);
    }
    return `${user.username} раздал ${itemsToGive.length} из ${inventory.length} предметов ${allUsers.length} участникам`;
  },

  Свинарник: async ({ db, userId }) => {
    const user = await getUser(db, userId);
    await scoreUser(db, userId, -3);
    return `${user.username} увидел свинку и испугался. МИНУС 3 ЧУБРИКА ТЕБЕ`;
  },

  "Гремлинская залупа": async ({ db, userId }) => {
    const user = await getUser(db, userId);
    const allItems = await db
      .select()
      .from(schema.inventory)
      .where(
        and(
          eq(schema.inventory.owner, userId),
          sql`${schema.inventory.label} != 'Гремлинская залупа'`,
        ),
      );
    const pool = allItems.filter((i) => !GREMLIN_IDS.includes(i.label));

    if (!pool.length) {
      await addInventory(db, userId, ITEM_DB_IDS.gremlin);
      return `${user.username} не хватило предметов, он получил Гремлина`;
    }

    const finalItem = pool[Math.floor(Math.random() * pool.length)]!;
    await removeInventoryById(db, finalItem.id);
    await addInventory(db, userId, ITEM_DB_IDS.gremlin);
    return `${user.username} превратил ${finalItem.label} в Гремлина`;
  },

  "Легендарная Морковка": async ({ db, userId }) => {
    const user = await getUser(db, userId);
    const finalScore = Math.floor(user.position / 3);
    await scoreUser(db, userId, finalScore);
    return `${user.username} получил ${finalScore} из-за ХОРОШЕЙ позиции на карте`;
  },

  "Таинственный предмет": async ({ db, userId }) => {
    const user = await getUser(db, userId);
    await changeUserStatus(db, userId, "Таинственный предмет", "add");
    return `${user.username} нашел легендарный предмет`;
  },

  "Светлое нефильтрованное": async ({ db, userId }) => {
    const user = await getUser(db, userId);
    await scoreUser(db, userId, 20);
    return `${user.username} выпил пивка`;
  },

  "Меч бесконечной лжи": async ({ db, userId }) => {
    const user = await getUser(db, userId);
    const [finalItem] = await db
      .select()
      .from(schema.inventory)
      .where(
        and(
          eq(schema.inventory.owner, userId),
          sql`${schema.inventory.label} != 'Меч бесконечной лжи'`,
        ),
      )
      .orderBy(sql`RANDOM()`)
      .limit(1);
    if (!finalItem) return null;

    await removeInventoryById(db, finalItem.id);
    await addInventory(db, userId, ITEM_DB_IDS.borsch);
    return `${user.username} превратил ${finalItem.label} в борщ`;
  },
};

export type UseItemResult =
  | { ok: true; mode: "done" }
  | { ok: true; mode: "modal"; label: string }
  | { ok: false; error: string };

export async function executeInventoryUse(
  db: Db,
  userId: string,
  inventoryId: string,
): Promise<UseItemResult> {
  const [inv] = await db
    .select()
    .from(schema.inventory)
    .where(eq(schema.inventory.id, inventoryId));

  if (!inv) return { ok: false, error: "Предмет не найден" };
  if (inv.owner !== userId) return { ok: false, error: "Не ваш предмет" };

  if (ITEM_MODAL_LABELS.has(inv.label)) {
    return { ok: true, mode: "modal", label: inv.label };
  }

  const handler = handlers[inv.label];
  if (handler) {
    const ctx: EffectCtx = { db, userId, inventoryId, label: inv.label };
    const activityText = await handler(ctx);
    if (activityText === null) {
      return { ok: false, error: "Эффект не сработал" };
    }

    if (inv.label !== "Erection - NPC" && inv.label !== "Крысиный тапок") {
      await consume(db, ctx, activityText);
    } else {
      await createActivity(db, {
        author: userId,
        image: (await getUser(db, userId)).avatar,
        text: activityText,
      });
    }

    return { ok: true, mode: "done" };
  }

  if (inv.type === "effect") {
    await changeUserStatus(db, userId, inv.label, "add");
    await chargeInventory(db, inventoryId, inv.charge, -1);
    return { ok: true, mode: "done" };
  }

  const user = await getUser(db, userId);
  await chargeInventory(db, inventoryId, inv.charge, -1);
  await createActivity(db, {
    author: userId,
    image: user.avatar,
    type: "emoji",
    text: `${user.username} использовал предмет ${inv.label}`,
  });
  return { ok: true, mode: "done" };
}
