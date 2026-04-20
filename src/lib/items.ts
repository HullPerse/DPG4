import UserApi from "@/api/user.api";
import CellApi from "@/api/cell.api";
import ItemsApi from "@/api/items.api";
import ActivityApi from "@/api/activity.api";
import { Inventory } from "@/types/items";
import { image } from "@/api/client.api";
import {
  getFirstCellInNextRow,
  getGridPosition,
  getLastCellInRow,
} from "./cell.utils";
import { shuffleArray } from "./utils";
import { Activity } from "@/types/activity";

const usersApi = new UserApi();
const itemsApi = new ItemsApi();
const cellApi = new CellApi();
const activityApi = new ActivityApi();

export async function usableItems(item: Inventory) {
  if (item.label === "Хрюкающая свинья") {
    const currentUser = await usersApi.getUserById(item.owner);

    const currentCell =
      (await cellApi.getCellByNumber(currentUser.position)) ?? 0;

    const statuses = [...(currentCell.status ?? []), "pig"];

    await cellApi.changeStatus(currentCell.id, statuses);
    await itemsApi.chargeInventory(String(item.id), item.charge, -1);

    const activityData = {
      author: currentUser.id,
      image: currentUser.avatar,
      type: "emoji",
      text: `${currentUser.username} подложил свинью на клетку ${currentCell.number}`,
    } as Activity;

    await activityApi.createActivity(activityData);
    return;
  }

  if (item.label === "Пакет конфеток") {
    const currentUser = await usersApi.getUserById(item.owner);
    await usersApi.scoreUser(item.owner, 50);

    await itemsApi.chargeInventory(String(item.id), item.charge, -1);

    const activityData = {
      author: currentUser.id,
      image: currentUser.avatar,
      type: "emoji",
      text: `${currentUser.username} съел целый пакет конфеток`,
    } as Activity;

    await activityApi.createActivity(activityData);
    return;
  }

  if (item.label === "Конфетка") {
    const currentUser = await usersApi.getUserById(item.owner);

    await usersApi.scoreUser(item.owner, 1);

    await itemsApi.chargeInventory(String(item.id), item.charge, -1);

    const activityData = {
      author: currentUser.id,
      image: currentUser.avatar,
      type: "emoji",
      text: `${currentUser.username} съел одну конфетку`,
    } as Activity;

    await activityApi.createActivity(activityData);
    return;
  }

  if (item.label === "Кал" || item.label === "Легендарный кал") {
    const currentUser = await usersApi.getUserById(item.owner);

    const currentCell =
      (await cellApi.getCellByNumber(currentUser.position)) ?? 0;

    await cellApi.changeStatus(currentCell.id, [
      ...(currentCell.status ?? []),
      "poop",
    ]);

    await itemsApi.chargeInventory(String(item.id), item.charge, -1);

    const activityData = {
      author: currentUser.id,
      image: currentUser.avatar,
      type: "emoji",
      text: `${currentUser.username} насрал на клетку ${currentCell.number}`,
    } as Activity;

    await activityApi.createActivity(activityData);
    return;
  }

  if (item.label === "Запаянный Крысиный Сундук") {
    const currentUser = await usersApi.getUserById(item.owner);

    Array.from({ length: 5 }, async () => {
      await itemsApi.addInventory(
        item.owner,
        "a29c7tdphmwlrbc",
        `${image?.items}a29c7tdphmwlrbc/100x100_162_nkg9c7eia4_593jsogdy7.png`,
      );
    });

    await itemsApi.chargeInventory(String(item.id), item.charge, -1);

    const activityData = {
      author: currentUser.id,
      image: "🐀",
      type: "emoji",
      text: `ААА КРЫСЫ ВЫПОЛЗАЮТ ИЗ СУНДУКА`,
    } as Activity;

    await activityApi.createActivity(activityData);
    return;
  }

  if (item.label === "Арбуз") {
    const currentUser = await usersApi.getUserById(item.owner);

    const currentRow = getGridPosition(currentUser.position).row;

    await usersApi.moveUser(
      String(currentUser.id),
      getLastCellInRow(currentRow),
    );

    await usersApi.changeUserAction(
      String(currentUser.id),
      currentUser.currentAction === "GAMEADD" ? "GAMEFINISH" : "GAMEADD",
    );

    await itemsApi.chargeInventory(String(item.id), item.charge, -1);
    return;
  }

  if (item.label === "Арбус") {
    const currentUser = await usersApi.getUserById(item.owner);

    const currentRow = getGridPosition(currentUser.position).row;

    await usersApi.moveUser(
      String(currentUser.id),
      getFirstCellInNextRow(currentRow),
    );

    await usersApi.changeUserAction(
      String(currentUser.id),
      currentUser.currentAction === "GAMEADD" ? "GAMEFINISH" : "GAMEADD",
    );

    await itemsApi.chargeInventory(String(item.id), item.charge, -1);
    return;
  }

  if (item.label === "Добрая крыса") {
    const currentUser = await usersApi.getUserById(item.owner);

    const allUsers = await usersApi.getAllUsers();
    const randomIndex = Math.floor(Math.random() * allUsers.length);
    const randomUser = allUsers[randomIndex];

    const targetInventory = await itemsApi.getInventory(String(randomUser.id));

    if (!targetInventory) return;

    const shuffledArray = shuffleArray(targetInventory);
    const halfItems = shuffledArray.slice(
      0,
      Math.floor(shuffledArray.length / 2),
    );

    //
    for (const inv of halfItems) {
      await itemsApi.sendInventory(String(inv.id), String(currentUser.id));
    }

    const activityData = {
      author: currentUser.id,
      image: currentUser.avatar,
      type: "emoji",
      text: `${currentUser.username} украл половину инвентаря ${randomUser.username}`,
    } as Activity;

    await activityApi.createActivity(activityData);

    await itemsApi.chargeInventory(String(item.id), item.charge, -1);
    return;
  }

  if (item.label === "Курва бобер") {
    const currentUser = await usersApi.getUserById(item.owner);

    const newPosition = currentUser.position - 4;

    await usersApi.moveUser(
      String(currentUser.id),
      newPosition < 0 ? 0 : newPosition,
    );

    await itemsApi.chargeInventory(String(item.id), item.charge, -1);
    return;
  }

  if (item.label === "Erection - NPC") {
    const currentUser = await usersApi.getUserById(item.owner);
    const allUsers = await usersApi.getAllUsers();
    const firstPosition = allUsers.reduce((max, user) =>
      user.position > max.position ? user : max,
    );

    const targetInventory = await itemsApi.getInventory(
      String(firstPosition.id),
    );
    const randomIndex = Math.floor(Math.random() * targetInventory.length);

    Array.from({ length: 2 }, async () => {
      await itemsApi.removeInventory(String(targetInventory[randomIndex].id));
    });

    const activityData = {
      author: currentUser.id,
      image: firstPosition.avatar,
      type: "emoji",
      text: `У ${firstPosition.username} пропало 2 предмета из-за странной магии...`,
    } as Activity;

    await activityApi.createActivity(activityData);

    await itemsApi.chargeInventory(String(item.id), item.charge, -1);
    return;
  }

  if (item.label === "Вакуум") {
    const currentUser = await usersApi.getUserById(item.owner);
    const allUsers = await usersApi.getAllUsers();

    for (const user of allUsers) {
      if (Math.abs(currentUser.position - user.position) > 5) continue;

      const inventory = await itemsApi.getInventory(String(user.id));
      const randomIndex = Math.floor(Math.random() * inventory.length);

      await itemsApi.sendInventory(
        String(inventory[randomIndex].id),
        item.owner,
      );
    }

    await itemsApi.chargeInventory(String(item.id), item.charge, -1);
    return;
  }

  if (item.label === "Налоговый инспектор") {
    const currentUser = await usersApi.getUserById(item.owner);
    const allUsers = await usersApi.getAllUsers();

    for (const user of allUsers) {
      if (user.position === 0) continue;

      const allCells = await cellApi.getCells();

      if (
        allCells
          .find((c) => c.number === user.position)
          ?.captured?.includes(String(user.id))
      ) {
        const finalValue = user.money >= 10 ? 10 : user.money;

        await usersApi.scoreUser(item.owner, finalValue);
        await usersApi.scoreUser(String(user.id), -finalValue);

        const activityData = {
          author: currentUser.id,
          image: allUsers.find((u) => u.id === item.owner)?.avatar,
          type: "emoji",
          text: `${allUsers.find((u) => u.id === item.owner)?.username} украл ${finalValue} чубриков у ${user.username}`,
        } as Activity;

        await activityApi.createActivity(activityData);
      }
    }

    await itemsApi.chargeInventory(String(item.id), item.charge, -1);
    return;
  }

  if (item.label === "Крысталлизатор") {
    const currentUser = await usersApi.getUserById(item.owner);
    const inventory = await itemsApi.getInventory(item.owner);
    const randomIndex = Math.floor(Math.random() * inventory.length);

    await itemsApi.removeInventory(inventory[randomIndex].id as string);
    await itemsApi.removeInventory(inventory[randomIndex].id as string);

    const activityData = {
      author: currentUser.id,
      image: currentUser.avatar,
      type: "emoji",
      text: `${currentUser.username} превратил ${inventory[randomIndex]} в КРЫСУ`,
    } as Activity;

    await activityApi.createActivity(activityData);

    await itemsApi.chargeInventory(String(item.id), item.charge, -1);
    return;
  }

  return await itemsApi.chargeInventory(String(item.id), item.charge, -1);
}
