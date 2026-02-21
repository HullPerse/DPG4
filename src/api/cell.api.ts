import { Cell } from "@/types/cell";
import { client } from "./client.api";

export default class CellApi {
  private readonly cellsCollection = client.collection("cells");

  getCells = async (): Promise<Cell[]> => {
    return await this.cellsCollection.getFullList();
  };

  getCellById = async (id: string) => {
    return await this.cellsCollection.getOne(id);
  };

  editCell = async (id: string, cell: Cell) => {
    return await this.cellsCollection.update(id, cell);
  };
}
