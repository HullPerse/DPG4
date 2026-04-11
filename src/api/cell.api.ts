import { Cell } from "@/types/cell";
import { client } from "./client.api";

export default class CellApi {
  private readonly cellsCollection = client.collection("cells");

  getCells = async (): Promise<Cell[]> => {
    return await this.cellsCollection.getFullList();
  };

  getCellById = async (id: string): Promise<Cell> => {
    return await this.cellsCollection.getOne(id);
  };

  getCellByNumber = async (number: number): Promise<Cell> => {
    return await this.cellsCollection.getFirstListItem(`number = ${number}`);
  };

  editCell = async (id: string, cell: Cell) => {
    return await this.cellsCollection.update(id, cell);
  };

  captureCell = async (username: string, cell: number) => {
    const existingCaptures = await this.getCellByNumber(cell);

    return await this.cellsCollection.update(existingCaptures.id, {
      captured: [...(existingCaptures.captured ?? []), username],
    });
  };
}
