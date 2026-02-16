import { Cell } from "@/types/cell";
import { client } from "./client.api";

export default class CellApi {
  private readonly cellsCollection = client.collection("cells");

  getCells = async (): Promise<Cell[]> => {
    return await this.cellsCollection.getFullList();
  };

  editCell = async (id: string, cell: Cell) => {
    return await this.cellsCollection.update(id, cell);
  };

  getMGE = async () => {
    return await fetch("https://mge.family/gameData.json").then((res) =>
      res.json(),
    );
  };
}
