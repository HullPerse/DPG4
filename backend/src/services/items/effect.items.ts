import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
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
import { Db } from "@/types";
import type { EffectCtx, UseItemResult } from "@/types/items";
import { UserService } from "@/services/user.service";
import { ActivityService } from "@/services/activity.service";
import { GameService } from "@/services/game.service";
import { EconomyService } from "@/services/economy.service";

export class EffectService {
  constructor(
    private db: Db,
    private userService: UserService,
    private activityService: ActivityService,
    private gameService: GameService,
    private economyService: EconomyService,
  ) {}

  private async getUser(userId: string) {
    const user = await this.userService.getById(userId);
    if (!user) throw new Error("User not found");
    return user;
  }

  private async consume(
    ctx: EffectCtx,
    activityText: string,
    skipCharge = false,
  ) {
    const user = await this.getUser(ctx.userId);
    if (!skipCharge) {
      const [inv] = await this.db
        .select()
        .from(schema.inventory)
        .where(eq(schema.inventory.id, ctx.inventoryId));
      if (!inv) throw new Error("Inventory not found");
      await this.economyService.chargeInventory(
        ctx.inventoryId,
        inv.charge,
        -1,
      );
    }
    await this.activityService.create({
      author: ctx.userId,
      image: user.avatar,
      text: activityText,
    });
  }

  private async getCellByNumber(number: number) {
    const [row] = await this.db
      .select()
      .from(schema.cells)
      .where(eq(schema.cells.number, number));
    return row ?? null;
  }

  private async patchCellStatus(cellId: string, status: string[]) {
    await this.db
      .update(schema.cells)
      .set({ status, updated: nowIso() })
      .where(eq(schema.cells.id, cellId));
    broadcast("cells", "update", cellId);
  }

  private async patchUser(
    userId: string,
    patch: Partial<typeof schema.users.$inferInsert>,
  ) {
    await this.db
      .update(schema.users)
      .set({ ...patch, updated: nowIso() })
      .where(eq(schema.users.id, userId));
    broadcast("users", "update", userId);
  }

  private handlers: Record<string, (ctx: EffectCtx) => Promise<string | null>> =
    {
      "Свиток реролла": async ({ userId }) => {
        const user = await this.getUser(userId);
        const game = await this.gameService.rerollUserLastGame(userId);
        if (!game) return null;
        const name = (game.data as { name?: string })?.name ?? "игру";
        return `${user.username} использовал свиток реролла на игре ${name}`;
      },

      "Гем Монтесумы": async ({ userId }) => {
        const user = await this.getUser(userId);
        return `${user.username} использовал Гем Монтесумы`;
      },

      Кредит: async ({ userId }) => {
        const user = await this.getUser(userId);
        if (user.money < 6) return null;
        await this.userService.score(userId, -6);
        await this.gameService.dropUserPlayingGame(userId);
        await this.patchUser(userId, { currentAction: "GAMEADD" });
        const game = await this.gameService.getLastForUser(userId);
        const name = (game?.data as { name?: string })?.name ?? "игру";
        return `${user.username} использовал Кредит на ${name}`;
      },

      Салфетка: async ({ userId }) => {
        const user = await this.getUser(userId);
        await this.gameService.rerollUserLastGame(userId);
        const game = await this.gameService.getLastForUser(userId);
        const name = (game?.data as { name?: string })?.name ?? "игру";
        return `${user.username} подтер ж̶о̶п̶у̶ ${name}`;
      },

      "Erection - NPC": async ({ userId, inventoryId }) => {
        const [firstPosition] = await this.db
          .select()
          .from(schema.users)
          .orderBy(desc(schema.users.position))
          .limit(1);
        if (!firstPosition) return null;
        const targetInventory = await this.db
          .select()
          .from(schema.inventory)
          .where(eq(schema.inventory.owner, firstPosition.id));
        if (targetInventory.length === 0) return null;

        let itemAmount = 0;
        const pick = () =>
          targetInventory[Math.floor(Math.random() * targetInventory.length)]!;

        if (targetInventory.length >= 2) {
          await this.economyService.removeInventoryById(pick().id);
          itemAmount += 1;
        }
        await this.economyService.removeInventoryById(pick().id);
        itemAmount += 1;

        const [currentItem] = await this.db
          .select()
          .from(schema.inventory)
          .where(eq(schema.inventory.id, inventoryId));
        if (currentItem) {
          await this.economyService.chargeInventory(
            inventoryId,
            currentItem.charge,
            -1,
          );
        }

        await this.activityService.create({
          author: userId,
          image: firstPosition.avatar,
          type: "emoji",
          text: `У ${firstPosition.username} пропало ${itemAmount} предмета из-за странной магии...`,
        });
        return null;
      },

      Арбуз: async ({ userId }) => {
        const user = await this.getUser(userId);
        const row = getGridPosition(user.position).row;
        const cell = getLastCellInRow(row);
        const action =
          user.currentAction === "GAMEADD" ? "GAMEFINISH" : "GAMEADD";
        await this.patchUser(userId, { position: cell, currentAction: action });
        return `${user.username} переместился на клетку ${cell}`;
      },

      Арбус: async ({ userId }) => {
        const user = await this.getUser(userId);
        const row = getGridPosition(user.position).row;
        const cell = getFirstCellInNextRow(row);
        const action =
          user.currentAction === "GAMEADD" ? "GAMEFINISH" : "GAMEADD";
        await this.patchUser(userId, { position: cell, currentAction: action });
        return `${user.username} переместился на клетку ${cell}`;
      },

      Кал: async ({ userId }) => {
        const user = await this.getUser(userId);
        const cell = await this.getCellByNumber(user.position);
        if (!cell) return null;
        await this.patchCellStatus(cell.id, [...(cell.status ?? []), "poop"]);
        return `${user.username} насрал на клетку ${cell.number}`;
      },

      "Легендарный кал": async ({ userId }) => {
        const user = await this.getUser(userId);
        const cell = await this.getCellByNumber(user.position);
        if (!cell) return null;
        await this.patchCellStatus(cell.id, [...(cell.status ?? []), "poop"]);
        return `${user.username} насрал на клетку ${cell.number}`;
      },

      Конфетка: async ({ userId }) => {
        const user = await this.getUser(userId);
        await this.userService.score(userId, 1);
        return `${user.username} съел одну конфетку`;
      },

      "Лимонная конфетка": async ({ userId }) => {
        const user = await this.getUser(userId);
        await this.userService.score(userId, 2);
        return `${user.username} съел одну лимонную конфетку`;
      },

      "Пакет конфеток": async ({ userId }) => {
        const user = await this.getUser(userId);
        await this.userService.score(userId, 10);
        return `${user.username} съел целый пакет конфеток`;
      },

      "Пакет лимонных конфеток": async ({ userId }) => {
        const user = await this.getUser(userId);
        await this.userService.score(userId, 15);
        return `${user.username} съел целый пакет лимонных конфеток`;
      },

      "Глюк матрицы": async ({ userId }) => {
        const user = await this.getUser(userId);
        const allItems = await this.db
          .select()
          .from(schema.inventory)
          .where(eq(schema.inventory.owner, userId));
        const filtered = allItems.filter((i) => i.label !== "Глюк матрицы");
        const finalItem = filtered[Math.floor(Math.random() * filtered.length)];
        if (!finalItem) return null;

        const [itemDB] = await this.db
          .select()
          .from(schema.items)
          .where(eq(schema.items.label, finalItem.label));
        if (!itemDB) return null;

        await this.economyService.addInventory(userId, itemDB.id);

        if (Math.random() * 100 <= 30) {
          await this.economyService.addInventory(userId, ITEM_DB_IDS.rat);
          await this.activityService.create({
            author: userId,
            image: user.avatar,
            type: "emoji",
            text: `${user.username} получил внезапную крысу`,
          });
        }

        return `${user.username} создал дубликат ${finalItem.label}`;
      },

      "Хрюкающая свинья": async ({ userId }) => {
        const user = await this.getUser(userId);
        const cell = await this.getCellByNumber(user.position);
        if (!cell) return null;
        await this.patchCellStatus(cell.id, [...(cell.status ?? []), "pig"]);
        return `${user.username} подложил свинью на клетку ${cell.number}`;
      },

      "Тупорылый кот": async ({ userId }) => {
        const user = await this.getUser(userId);
        const cell = await this.getCellByNumber(user.position);
        if (!cell) return null;
        await this.patchCellStatus(cell.id, [...(cell.status ?? []), "cat"]);
        return `${user.username} потерял кота на клетке ${cell.number}`;
      },

      Вакуум: async ({ userId }) => {
        const user = await this.getUser(userId);
        const allUsers = await this.db.select().from(schema.users);
        const nearbyIds = allUsers
          .filter(
            (other) =>
              other.id !== userId &&
              Math.abs(user.position - other.position) <= 5,
          )
          .map((u) => u.id);
        if (nearbyIds.length > 0) {
          const allNearbyInventory = await this.db
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
            await this.economyService.transferInventoryOwner(id, userId);
          }
        }
        return `${user.username} всосал несколько предметов`;
      },

      "Налоговый инспектор": async ({ userId }) => {
        const user = await this.getUser(userId);
        const allUsers = await this.db
          .select()
          .from(schema.users)
          .where(ne(schema.users.position, 0));

        for (const other of allUsers) {
          const [cell] = await this.db
            .select()
            .from(schema.cells)
            .where(eq(schema.cells.number, other.position));
          if (!cell?.captured?.includes(other.id)) continue;
          const finalValue = other.money >= 10 ? 10 : other.money;
          await this.userService.score(userId, finalValue);
          await this.userService.score(other.id, -finalValue);
        }
        return `${user.username} своровал бабки у бабки`;
      },

      Ведро: async ({ userId }) => {
        const user = await this.getUser(userId);
        const allUsers = await this.db
          .select()
          .from(schema.users)
          .where(ne(schema.users.id, userId))
          .then((res) =>
            res.map((u) => ({
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
        const finalItemId =
          itemIds[Math.floor(Math.random() * itemIds.length)]!;
        const [itemData] = await this.db
          .select()
          .from(schema.items)
          .where(eq(schema.items.id, finalItemId));
        if (!itemData) return null;

        await this.economyService.addInventory(userId, itemData.id);
        return `${user.username} подоил игрока ${closest.user.username} и получил ${itemData.label}`;
      },

      "Ведро с Польпо": async ({ userId }) => {
        const user = await this.getUser(userId);
        const finalMoney = Math.random() < 0.5 ? 10 : -10;
        await this.userService.score(userId, finalMoney);
        return `${user.username} ${finalMoney > 0 ? "получил" : "потерял"} 10 чубриков из-за Польпо`;
      },

      Страховка: async ({ userId }) => {
        const user = await this.getUser(userId);
        const game = await this.gameService.rerollUserLastGame(userId);
        if (!game) return null;
        const name = (game.data as { name?: string })?.name ?? "игру";
        return `${user.username} рерольнул ${name} по страховке`;
      },

      "Стул Трампа": async ({ userId }) => {
        const user = await this.getUser(userId);
        const cell = await this.getCellByNumber(user.position);
        if (!cell) return null;
        await this.patchCellStatus(cell.id, [...(cell.status ?? []), "chair"]);
        return `${user.username} выкинул стул на клетку ${cell.number}`;
      },

      "Минус 8 чубриков": async ({ userId }) => {
        const user = await this.getUser(userId);
        await this.userService.score(userId, -1);
        return `${user.username} обманули, и н потерял 1 чубрик`;
      },

      "Курва бобер": async ({ userId }) => {
        const user = await this.getUser(userId);
        const newPosition = Math.max(0, user.position - 4);
        await this.patchUser(userId, { position: newPosition });
        return `${user.username} погнался на Курва Бобром и переместился на клетку ${newPosition}`;
      },

      "Крыса Изгой": async ({ userId }) => {
        const user = await this.getUser(userId);
        const [finalItem] = await this.db
          .select()
          .from(schema.inventory)
          .where(
            sql`${schema.inventory.owner} != ${userId} AND ${schema.inventory.label} != 'Крыса Изгой'`,
          )
          .orderBy(sql`RANDOM()`)
          .limit(1);
        if (!finalItem) return null;

        const [currentItem] = await this.db
          .select()
          .from(schema.inventory)
          .where(eq(schema.inventory.owner, userId))
          .orderBy(sql`RANDOM()`)
          .limit(1);
        if (!currentItem) return null;

        await this.economyService.transferInventoryOwner(finalItem.id, userId);
        await this.economyService.transferInventoryOwner(
          currentItem.id,
          finalItem.owner,
        );
        return `${user.username} украл ${finalItem.label}`;
      },

      "Добрая крыса": async ({ userId }) => {
        const user = await this.getUser(userId);
        const allItems = await this.db
          .select()
          .from(schema.inventory)
          .where(
            and(
              ne(schema.inventory.owner, userId),
              ne(schema.inventory.label, "Добрая крыса"),
            ),
          );
        const targetIds = [...new Set(allItems.map((i) => i.owner))];
        if (!targetIds.length) return null;

        const targetId =
          targetIds[Math.floor(Math.random() * targetIds.length)]!;
        const targetInventory = allItems.filter((i) => i.owner === targetId);
        const shuffled = [...targetInventory].sort(() => Math.random() - 0.5);
        const halfCount = Math.floor(shuffled.length / 2);
        const ids = shuffled.slice(0, halfCount).map((i) => i.id);

        if (ids.length > 0) {
          await this.db
            .update(schema.inventory)
            .set({ owner: userId, updated: nowIso() })
            .where(inArray(schema.inventory.id, ids));
          for (const id of ids) {
            broadcast("inventory", "update", id);
          }
        }

        const targetUser = await this.userService.getById(targetId);
        return `${user.username} украл половину инвентаря ${targetUser?.username ?? "игрока"}`;
      },

      "Запаянный Крысиный Сундук": async ({ userId }) => {
        for (let i = 0; i < 5; i++) {
          await this.economyService.addInventory(userId, ITEM_DB_IDS.chestRats);
        }
        return `ААА КРЫСЫ ВЫПОЛЗАЮТ ИЗ СУНДУКА`;
      },

      "Крыса наркоманка": async ({ userId }) => {
        const user = await this.getUser(userId);
        const [finalItem] = await this.db
          .select()
          .from(schema.inventory)
          .where(
            sql`${schema.inventory.label} != 'Крыса наркоманка' AND ${schema.inventory.owner} != ${userId}`,
          )
          .orderBy(sql`RANDOM()`)
          .limit(1);
        if (!finalItem) return null;

        await this.economyService.transferInventoryOwner(finalItem.id, userId);
        await this.economyService.addInventory(
          finalItem.owner,
          ITEM_DB_IDS.poop,
        );
        await this.userService.score(userId, 10);
        return `${user.username} украл и насрал`;
      },

      "Крысиный тапок": async ({ userId, inventoryId }) => {
        const user = await this.getUser(userId);
        const [finalItem] = await this.db
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

        await this.economyService.removeInventoryById(finalItem.id);
        await this.userService.changeStatus(userId, "Крысиный тапок", "add");
        const [inv] = await this.db
          .select()
          .from(schema.inventory)
          .where(eq(schema.inventory.id, inventoryId));
        if (inv)
          await this.economyService.chargeInventory(
            inventoryId,
            inv.charge,
            -1,
          );
        return `${user.username} потреля ${finalItem.label}, но получил доп. кубик`;
      },

      "Крыса гой": async ({ userId }) => {
        const user = await this.getUser(userId);
        const [finalItem] = await this.db
          .select()
          .from(schema.inventory)
          .where(sql`${schema.inventory.owner} != ${userId}`)
          .orderBy(sql`RANDOM()`)
          .limit(1);
        if (!finalItem) return null;

        await this.economyService.transferInventoryOwner(finalItem.id, userId);
        const finalMoney = user.money > 0 ? -user.money : -4;
        await this.userService.score(userId, finalMoney);
        return `У ${user.username} выпали из кармана все чубрики, пока он воровал ${finalItem.label}`;
      },

      "Алтарь обновления": async ({ userId }) => {
        const user = await this.getUser(userId);
        const allItems = await this.db
          .select()
          .from(schema.inventory)
          .where(eq(schema.inventory.owner, userId));
        for (const item of allItems) {
          await this.economyService.removeInventoryById(item.id);
        }
        return `${user.username} принес в жертву ${allItems.length} предметов`;
      },

      Апельсин: async ({ userId }) => {
        const user = await this.getUser(userId);
        await this.userService.score(userId, 2);
        await this.patchUser(userId, {
          position: user.position + 1,
          currentAction: "GAMEADD",
        });
        return `${user.username} съел вкусный апельсин`;
      },

      "Ебануто живучая свинья": async ({ userId }) => {
        const user = await this.getUser(userId);
        const allUsers = await this.db
          .select()
          .from(schema.users)
          .where(ne(schema.users.id, userId));
        const statuses = user.status ?? [];
        if (!statuses.length || !allUsers.length) return null;

        const finalStatus =
          statuses[Math.floor(Math.random() * statuses.length)]!;
        const finalUser =
          allUsers[Math.floor(Math.random() * allUsers.length)]!;
        await this.userService.changeStatus(userId, finalStatus, "remove");
        await this.userService.changeStatus(finalUser.id, finalStatus, "add");
        return `${user.username} отправил эффект ${finalStatus} ${finalUser.username}`;
      },

      "Зелье Крысогеддона": async ({ userId }) => {
        const user = await this.getUser(userId);
        const pool = await this.db
          .select()
          .from(schema.users)
          .where(ne(schema.users.id, userId))
          .then((res) => res.filter((u) => u.status && u.status.length > 0));
        const finalUser = pool[Math.floor(Math.random() * pool.length)];
        if (!finalUser?.status?.length) return null;

        const finalStatus =
          finalUser.status[
            Math.floor(Math.random() * finalUser.status.length)
          ]!;
        const finalItem =
          Math.random() < 0.3 ? ITEM_DB_IDS.poop : ITEM_DB_IDS.rat;

        await this.userService.changeStatus(
          finalUser.id,
          finalStatus,
          "remove",
        );
        await this.economyService.addInventory(finalUser.id, finalItem);
        const itemName = finalItem === ITEM_DB_IDS.rat ? "крысу" : "кал";
        return `${user.username} превратил ${finalUser.username}: ${finalStatus} в ${itemName}`;
      },

      "Крысиная раздача": async ({ userId }) => {
        const user = await this.getUser(userId);
        const allUsers = await this.db.select().from(schema.users);
        for (const u of allUsers) {
          await this.economyService.addInventory(u.id, ITEM_DB_IDS.rat);
        }
        return `${user.username} выдал ВСЕМ по крысе`;
      },

      Крысавчик: async ({ userId }) => {
        const user = await this.getUser(userId);
        const inventory = await this.db
          .select()
          .from(schema.inventory)
          .where(eq(schema.inventory.owner, userId));
        const rats = inventory.filter((i) => RAT_IDS.includes(i.label));

        if (rats.length === 0) {
          await this.userService.score(userId, -2);
          return `${user.username} потерял 2 чубрика из-за отсутствия крыс`;
        }
        await this.userService.score(userId, rats.length);
        return `${user.username} получил ${rats.length} чубриков из-за крыс`;
      },

      Свинство: async ({ userId }) => {
        const user = await this.getUser(userId);
        const inventory = await this.db
          .select()
          .from(schema.inventory)
          .where(eq(schema.inventory.owner, userId));
        const allUsers = await this.db
          .select()
          .from(schema.users)
          .then((res) => res.filter((u) => u.id !== userId));

        const half = Math.ceil(inventory.length / 2);
        const itemsToGive = inventory.slice(0, half);
        const ts = nowIso();
        for (let i = 0; i < itemsToGive.length; i++) {
          const targetUser = allUsers[i % allUsers.length];
          if (!targetUser) continue;
          await this.db
            .update(schema.inventory)
            .set({ owner: targetUser.id, updated: ts })
            .where(eq(schema.inventory.id, itemsToGive[i]!.id));
          broadcast("inventory", "update", itemsToGive[i]!.id);
        }
        return `${user.username} раздал ${itemsToGive.length} из ${inventory.length} предметов ${allUsers.length} участникам`;
      },

      Свинарник: async ({ userId }) => {
        const user = await this.getUser(userId);
        await this.userService.score(userId, -3);
        return `${user.username} увидел свинку и испугался. МИНУС 3 ЧУБРИКА ТЕБЕ`;
      },

      "Гремлинская залупа": async ({ userId }) => {
        const user = await this.getUser(userId);
        const allItems = await this.db
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
          await this.economyService.addInventory(userId, ITEM_DB_IDS.gremlin);
          return `${user.username} не хватило предметов, он получил Гремлина`;
        }

        const finalItem = pool[Math.floor(Math.random() * pool.length)]!;
        await this.economyService.removeInventoryById(finalItem.id);
        await this.economyService.addInventory(userId, ITEM_DB_IDS.gremlin);
        return `${user.username} превратил ${finalItem.label} в Гремлина`;
      },

      "Легендарная Морковка": async ({ userId }) => {
        const user = await this.getUser(userId);
        const finalScore = Math.floor(user.position / 3);
        await this.userService.score(userId, finalScore);
        return `${user.username} получил ${finalScore} из-за ХОРОШЕЙ позиции на карте`;
      },

      "Таинственный предмет": async ({ userId }) => {
        const user = await this.getUser(userId);
        await this.userService.changeStatus(
          userId,
          "Таинственный предмет",
          "add",
        );
        return `${user.username} нашел легендарный предмет`;
      },

      "Светлое нефильтрованное": async ({ userId }) => {
        const user = await this.getUser(userId);
        await this.userService.score(userId, 20);
        return `${user.username} выпил пивка`;
      },

      "Меч бесконечной лжи": async ({ userId }) => {
        const user = await this.getUser(userId);
        const [finalItem] = await this.db
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

        await this.economyService.removeInventoryById(finalItem.id);
        await this.economyService.addInventory(userId, ITEM_DB_IDS.borsch);
        return `${user.username} превратил ${finalItem.label} в борщ`;
      },

      "Крысиный анус": async ({ userId }) => {
        const user = await this.getUser(userId);
        const cell = await this.getCellByNumber(user.position);
        if (!cell) return null;
        await this.patchCellStatus(cell.id, [
          ...(cell.status ?? []),
          "sausage",
        ]);

        await this.patchUser("9f3u9vi4k7tvhgf", { position: cell.number });
        return `${user.username} положил сосиску на клетку ${cell.number}`;
      },
      "Крысиный потоп": async ({ userId }) => {
        const user = await this.getUser(userId);
        const allItems = await this.db
          .select()
          .from(schema.inventory)
          .where(
            and(
              eq(schema.inventory.owner, userId),
              ne(schema.inventory.label, "Крысиный потоп"),
            ),
          );

        const shuffled = [...allItems].sort(() => Math.random() - 0.5);
        const halfCount = Math.floor(shuffled.length / 2);
        const ids = shuffled.slice(0, halfCount).map((i) => i.id);
        if (ids.length === 0) return null;

        const ratLabels = [...RAT_IDS];
        const ratItems = await this.db
          .select()
          .from(schema.items)
          .where(inArray(schema.items.label, ratLabels));
        if (ratItems.length === 0) return null;

        for (const id of ids) {
          await this.economyService.removeInventoryById(id);
          const ratItem =
            ratItems[Math.floor(Math.random() * ratItems.length)]!;
          await this.economyService.addInventory(userId, ratItem.id);
        }

        return `${user.username} заменил ${ids.length} предметов на случайных крыс`;
      },
    };

  async executeUse(
    userId: string,
    inventoryId: string,
  ): Promise<UseItemResult> {
    const [inv] = await this.db
      .select()
      .from(schema.inventory)
      .where(eq(schema.inventory.id, inventoryId));

    if (!inv) return { ok: false, error: "Предмет не найден" };
    if (inv.owner !== userId) return { ok: false, error: "Не ваш предмет" };

    if (ITEM_MODAL_LABELS.has(inv.label)) {
      return { ok: true, mode: "modal", label: inv.label };
    }

    const handler = this.handlers[inv.label];
    if (handler) {
      const ctx: EffectCtx = { userId, inventoryId, label: inv.label };
      const activityText = await handler(ctx);
      if (activityText === null) {
        return { ok: false, error: "Эффект не сработал" };
      }

      if (inv.label !== "Erection - NPC" && inv.label !== "Крысиный тапок") {
        await this.consume(ctx, activityText);
      } else {
        await this.activityService.create({
          author: userId,
          image: (await this.getUser(userId)).avatar,
          text: activityText,
        });
      }

      return { ok: true, mode: "done" };
    }

    if (inv.type === "effect") {
      await this.userService.changeStatus(userId, inv.label, "add");
      await this.economyService.chargeInventory(inventoryId, inv.charge, -1);
      return { ok: true, mode: "done" };
    }

    const user = await this.getUser(userId);
    await this.economyService.chargeInventory(inventoryId, inv.charge, -1);
    await this.activityService.create({
      author: userId,
      image: user.avatar,
      type: "emoji",
      text: `${user.username} использовал предмет ${inv.label}`,
    });
    return { ok: true, mode: "done" };
  }
}
