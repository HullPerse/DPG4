import { User } from "@/types/user";
import { client } from "./client.api";
import { useDataStore } from "@/store/data.store";
import { calculateMovePath } from "@/lib/cell.utils";
import CellApi from "./cell.api";
import { getNextDice, removeFirst } from "@/lib/utils";
import { Activity } from "@/types/activity";

const cellApi = new CellApi();

export default class UserApi {
  private readonly usersCollection = client.collection("users");
  private readonly activityCollection = client.collection("activity");

  //create new user
  create = async (data: User) => {
    try {
      await this.usersCollection
        .create({
          ...data,
          isAdmin: false,
          passwordConfirm: data.password,
          email: `${data.username}@gmail.com`,
          position: 0,
          currentAction: "MOVE_POSITIVE",
          currentDice: 1,
          place: "0",
          online: false,
        })
        .then(async (res) => {
          const activityData = {
            author: data.id,
            image: data.avatar,
            type: "emoji",
            text: `${data.username} создал аккаунт`,
          } as Activity;
          await this.activityCollection.create(activityData);
          return res;
        });
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  //check for existing user data
  getExisting = async () => {
    return await this.usersCollection.getFullList({
      fields: "username, avatar, color",
    });
  };

  getAllIds = async () => {
    return await this.usersCollection.getFullList({
      fields: "id",
    });
  };

  getAllUsers = async (): Promise<User[]> => {
    return await this.usersCollection.getFullList({
      fields: "id, username, avatar, color, money, position, online",
    });
  };

  //get all user positions
  getUserPositions = async (): Promise<User[]> => {
    return await this.usersCollection.getFullList({
      fields: "id, position, username, avatar, color, place",
    });
  };

  //get user by id
  getUserById = async (userId: string): Promise<User> => {
    return await this.usersCollection.getOne(userId);
  };

  getUserByUsername = async (username: string): Promise<User> => {
    return (await this.getAllUsers().then((res) =>
      res.find((u) => u.username === username),
    )) as User;
  };

  changeUserAction = async (
    userId: string,
    action: "MOVE_POSITIVE" | "MOVE_NEGATIVE" | "GAMEADD" | "GAMEFINISH",
  ) => {
    await this.usersCollection.update(userId, { currentAction: action });
  };

  changeUserDice = async (
    userId: string,
    realTime: number,
    action: "MOVE_POSITIVE" | "MOVE_NEGATIVE",
  ) => {
    const currentCell = await this.getUserById(userId).then(
      (res) => res.position,
    );

    if (!currentCell)
      await this.usersCollection.update(userId, {
        currentDice: 1,
      });

    await this.usersCollection.update(userId, {
      currentDice: getNextDice(realTime, currentCell, action),
    });
  };

  //move user
  moveUser = async (userId: string, newPosition: number) => {
    await this.usersCollection.update(userId, { position: newPosition });
  };

  moveUserAnimated = async (userId: string, newPosition: number) => {
    const currentUser = await this.getUserById(userId);
    //const userInventory = await this.itemsApi.getInventory(userId);

    const { startMoving } = useDataStore.getState();

    const fromPosition = currentUser.position || 0;
    const cells = await cellApi.getCells();

    const { path, finalPosition } = calculateMovePath(
      fromPosition,
      newPosition - fromPosition,
      cells,
    );

    startMoving(userId, fromPosition, newPosition, finalPosition, path);

    await this.usersCollection.update(userId, { position: finalPosition });

    //const currentCell = cells.find((c) => c.number === fromPosition);
    const targetCell = cells.find((c) => c.number === finalPosition);

    //PIG
    if (targetCell?.status?.includes("pig")) {
      const audio = new Audio("/audio/pig.mp3");
      audio.volume = 0.1;
      audio.play();

      await cellApi.changeStatus(
        targetCell.id,
        removeFirst(targetCell.status ?? [], "pig"),
      );
    }

    //CAT
    if (targetCell?.status?.includes("cat")) {
      const audio = new Audio("/audio/cat.mp3");
      audio.volume = 0.1;
      audio.play();

      await cellApi.changeStatus(
        targetCell.id,
        removeFirst(targetCell.status ?? [], "cat"),
      );
    }

    await this.changeUserAction(userId, "GAMEADD");
  };

  getUserScore = async (userId: string): Promise<number> => {
    const user: User = await this.usersCollection.getOne(userId);

    return user.money;
  };

  scoreUser = async (userId: string, score: number) => {
    const currentScore = await this.getUserScore(userId);

    return await this.usersCollection.update(userId, {
      money: currentScore + score,
    });
  };

  getAllPlaces = async () => {
    return this.usersCollection.getFullList({
      fields: "place",
    });
  };

  updatePlace = async (userId: string) => {
    const allPlaces = await this.getAllPlaces();
    const existingPlaces = allPlaces.map((p) => p.place);
    if (
      existingPlaces.includes("1") &&
      existingPlaces.includes("2") &&
      existingPlaces.includes("3")
    ) {
      return;
    }
    const finalPlace = !existingPlaces.includes("1")
      ? "1"
      : !existingPlaces.includes("2")
        ? "2"
        : "3";

    const user = await this.getUserById(userId);

    if (!user) return;

    const activityData = {
      image: user.avatar,
      type: "emoji",
      text: `${user.username} занял ${finalPlace} позицию`,
    } as Activity;
    await this.activityCollection.create(activityData);

    return await this.usersCollection.update(String(user.id), {
      place: finalPlace,
    });
  };
}
