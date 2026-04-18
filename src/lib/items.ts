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
    return;
  }

  if (item.label === "Пакет конфеток") {
    await usersApi.scoreUser(item.owner, 50);

    await itemsApi.chargeInventory(String(item.id), item.charge, -1);
    return;
  }

  if (item.label === "Конфетка") {
    await usersApi.scoreUser(item.owner, 1);

    await itemsApi.chargeInventory(String(item.id), item.charge, -1);
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
    return;
  }

  if (item.label === "Запаянный Крысиный Сундук") {
    Array.from({ length: 5 }, async () => {
      await itemsApi.addInventory(
        item.owner,
        "a29c7tdphmwlrbc",
        `${image?.items}${item.id}/${item.image}`,
      );
    });

    await itemsApi.chargeInventory(String(item.id), item.charge, -1);
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
      image: firstPosition.avatar,
      type: "emoji",
      text: `У ${firstPosition.username} пропало 2 предмета из-за странной магии...`,
    } as Activity;

    await activityApi.createActivity(activityData);

    await itemsApi.chargeInventory(String(item.id), item.charge, -1);
    return;
  }

  return await itemsApi.chargeInventory(String(item.id), item.charge, -1);
}
