import { PaintType } from "@/types/paint";
import { client } from "./client.api";

export default class PaintApi {
  private readonly paintCollection = client.collection("drawings");

  createDraw = async (data: PaintType) => {
    return await this.paintCollection.create(data);
  };

  getAllDrawings = async (): Promise<PaintType[]> => {
    return await this.paintCollection.getFullList();
  };

  getDrawinsByAuthor = async (userId: string): Promise<PaintType[]> => {
    return await this.paintCollection.getFullList({
      filter: `author.id = "${userId}"`,
      sort: "-created",
    });
  };

  updateDraw = async (id: string, data: Partial<PaintType>) => {
    return await this.paintCollection.update(id, data);
  };
}
