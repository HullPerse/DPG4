import { PaintType } from "@/types/paint";
import { apiFetch } from "./client.api";
import { filePayload } from "@/lib/fileBlob";

export default class PaintApi {
  createDraw = async (data: PaintType): Promise<PaintType> => {
    const image =
      data.image instanceof File ? await filePayload(data.image) : data.image;
    return apiFetch<PaintType>("/drawings", {
      method: "POST",
      body: { ...data, image },
    });
  };

  getAllDrawings = async (): Promise<PaintType[]> =>
    apiFetch<PaintType[]>("/drawings");

  getDrawingsByAuthor = async (userId: string): Promise<PaintType[]> =>
    apiFetch<PaintType[]>(`/drawings?authorId=${userId}`);

  /** @deprecated use getDrawingsByAuthor */
  getDrawinsByAuthor = this.getDrawingsByAuthor;

  updateDraw = async (id: string, data: Partial<PaintType>) => {
    const image =
      data.image instanceof File ? await filePayload(data.image) : data.image;
    return apiFetch(`/drawings/${id}`, {
      method: "PATCH",
      body: { ...data, image },
    });
  };

  removeDraw = async (id: string) =>
    apiFetch(`/drawings/${id}`, { method: "DELETE" });
}
