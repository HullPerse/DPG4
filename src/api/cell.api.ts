import { client } from "./client.api";

export default class CellApi {
  private readonly cellsCollection = client.collection("cells");

  getCells = async () => {
    return await this.cellsCollection.getFullList();
  };
}
