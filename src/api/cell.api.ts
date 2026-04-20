import { Cell } from "@/types/cell";
import { client } from "./client.api";
import { Activity } from "@/types/activity";

export default class CellApi {
  private readonly cellsCollection = client.collection("cells");
  private readonly activityCollection = client.collection("activity");

  getCells = async (): Promise<Cell[]> => {
    return await this.cellsCollection.getFullList();
  };

  getCellById = async (id: string): Promise<Cell> => {
    return await this.cellsCollection.getOne(id);
  };

  getCellByNumber = async (number: number): Promise<Cell> => {
    return await this.cellsCollection.getFirstListItem(`number = ${number}`);
  };

  changeStatus = async (id: string, statuses: string[]) => {
    return await this.cellsCollection.update(id, {
      status: statuses,
    });
  };

  editCell = async (id: string, cell: Cell) => {
    return await this.cellsCollection.update(id, cell);
  };

  captureCell = async (userId: string, username: string, cell: number) => {
    const existingCaptures = await this.getCellByNumber(cell);

    const activityData = {
      author: userId,
      image: "✅",
      type: "emoji",
      text: `${username} захватил клетку ${cell}`,
    } as Activity;
    await this.activityCollection.create(activityData);

    return await this.cellsCollection.update(existingCaptures.id, {
      captured: [...(existingCaptures.captured ?? []), username],
    });
  };
}
