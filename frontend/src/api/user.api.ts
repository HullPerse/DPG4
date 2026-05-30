import { User } from "@/types/user";
import { apiFetch } from "./client.api";
import { useDataStore } from "@/store/data.store";
import { calculateMovePath } from "@/lib/cell.utils";
import CellApi from "./cell.api";
import { usableCell } from "@/lib/cell.effects";

const cellApi = new CellApi();

export default class UserApi {
  create = async (data: User) => {
    try {
      await apiFetch("/auth/register", {
        method: "POST",
        body: {
          username: data.username,
          password: data.password,
          avatar: data.avatar,
          color: data.color,
        },
        auth: false,
      });
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  getExisting = async () => {
    const users = await apiFetch<User[]>("/users?fields=username,avatar,color");
    return users;
  };

  getAllIds = async () => {
    const users = await apiFetch<User[]>("/users?fields=id");
    return users;
  };

  getAllUsers = async (): Promise<User[]> => {
    return apiFetch<User[]>("/users?fields=id,username,avatar,color,money,position,status");
  };

  getUserPositions = async (): Promise<User[]> => {
    return apiFetch<User[]>(
      "/users?fields=id,position,username,avatar,color,place,status",
    );
  };

  getUserById = async (userId: string): Promise<User> => {
    return apiFetch<User>(`/users/${userId}`);
  };

  getUserByUsername = async (username: string): Promise<User> => {
    return (await this.getAllUsers().then((res) =>
      res.find((u) => u.username === username),
    )) as User;
  };

  changeUserStatus = async (
    userId: string,
    status: string,
    type: "add" | "remove",
  ) => {
    return apiFetch(`/users/${userId}/status`, {
      method: "POST",
      body: { status, type },
    });
  };

  changeUserAction = async (
    userId: string,
    action: "MOVE_POSITIVE" | "MOVE_NEGATIVE" | "GAMEADD" | "GAMEFINISH",
  ) => {
    const { noAction } = useDataStore.getState();
    if (noAction) return;
    return apiFetch(`/users/${userId}`, {
      method: "PATCH",
      body: { currentAction: action },
    });
  };

  changeUserDice = async (
    userId: string,
    realTime: number,
    action: "MOVE_POSITIVE" | "MOVE_NEGATIVE",
  ) => {
    return apiFetch(`/users/${userId}/dice`, {
      method: "POST",
      body: { realTime, action },
    });
  };

  moveUser = async (userId: string, newPosition: number) => {
    return apiFetch(`/users/${userId}`, {
      method: "PATCH",
      body: { position: newPosition },
    });
  };

  moveUserAnimated = async (userId: string, newPosition: number) => {
    const currentUser = await this.getUserById(userId);
    const { startMoving } = useDataStore.getState();
    const fromPosition = currentUser.position || 0;
    const cells = await cellApi.getCells();

    const { path, finalPosition } = calculateMovePath(
      fromPosition,
      newPosition - fromPosition,
      cells,
    );

    startMoving(userId, fromPosition, newPosition, finalPosition, path);
    await this.moveUser(userId, finalPosition);

    const targetCell = cells.find((c) => c.number === finalPosition);
    if (targetCell) await usableCell(targetCell, userId);
    await this.changeUserAction(userId, "GAMEADD");
  };

  getUserScore = async (userId: string): Promise<number> => {
    const user = await this.getUserById(userId);
    return user.money;
  };

  scoreUser = async (userId: string, score: number, trade?: boolean) => {
    const user = await apiFetch<User>(`/users/${userId}/score`, {
      method: "POST",
      body: { score, trade },
    });
    return user;
  };

  getAllPlaces = async () => {
    return apiFetch<{ place: string }[]>("/users?fields=place");
  };

  removePlace = async (userId: string) => {
    return apiFetch(`/users/${userId}/place`, { method: "DELETE" });
  };

  updatePlace = async (userId: string) => {
    return apiFetch(`/users/${userId}/place`, { method: "POST" });
  };
}
