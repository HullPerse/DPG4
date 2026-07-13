import { Cell } from "@/types/cell";
import CellApi from "@/api/cell.api";
import { removeFirst } from "./index.utils";
import { userApi } from "@/api/user.api";

let cellApiInstance: InstanceType<typeof CellApi> | null = null;

const getCellApi = () => {
  if (!cellApiInstance) cellApiInstance = new CellApi();
  return cellApiInstance;
};

export async function usableCell(cell: Cell, userId: string) {
  const cellApi = getCellApi();

  //PIG
  if (cell?.status?.includes("pig")) {
    const audio = new Audio("/audio/pig.mp3");
    audio.volume = 0.1;
    audio.play();

    await cellApi.changeStatus(cell.id, removeFirst(cell.status ?? [], "pig"));
  }

  //CAT
  if (cell?.status?.includes("cat")) {
    const audio = new Audio("/audio/cat.mp3");
    audio.volume = 0.1;
    audio.play();

    await cellApi.changeStatus(cell.id, removeFirst(cell.status ?? [], "cat"));
  }

  //CHAIR
  if (cell?.status?.includes("chair")) {
    const audio = new Audio("/audio/trump.mp3");
    audio.volume = 0.1;
    audio.play();

    await cellApi.changeStatus(cell.id, removeFirst(cell.status ?? [], "chair"));
  }

  //POOP
  if (cell?.status?.includes("poop")) {
    await userApi.changeUserStatus(userId, "poop", "add");
  }
}
