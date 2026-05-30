import { Cell } from "@/types/cell";
import { apiFetch } from "./client.api";

export default class CellApi {
  getCells = async (): Promise<Cell[]> => apiFetch<Cell[]>("/cells");

  getCellById = async (id: string): Promise<Cell> =>
    apiFetch<Cell>(`/cells/${id}`);

  getCellByNumber = async (number: number): Promise<Cell> =>
    apiFetch<Cell>(`/cells/by-number/${number}`);

  changeStatus = async (id: string, statuses: string[]) =>
    apiFetch(`/cells/${id}`, {
      method: "PATCH",
      body: { status: statuses },
    });

  editCell = async (id: string, cell: Cell) =>
    apiFetch(`/cells/${id}`, { method: "PATCH", body: cell });

  captureCell = async (userId: string, username: string, cell: number) => {
    const existing = await this.getCellByNumber(cell);
    return apiFetch(`/cells/${existing.id}/capture`, {
      method: "POST",
      body: { userId, username },
    });
  };
}
