import UserApi from "@/api/user.api";
import CellApi from "@/api/cell.api";
import ItemsApi from "@/api/items.api";
import { Inventory } from "@/types/items";

const usersApi = new UserApi();
const itemsApi = new ItemsApi();
const cellApi = new CellApi();

export async function usableItems(item: Inventory) {
  if (item.label === "Хрюкающая свинья") {
    const currentUser = await usersApi.getUserById(item.owner);

    const currentCell =
      (await cellApi.getCellByNumber(currentUser.position)) ?? 0;

    const statuses = [...(currentCell.status ?? []), "pig"];

    await cellApi.changeStatus(currentCell.id, statuses);
    await itemsApi.removeInventory(String(item.id));
    return;
  }
}
