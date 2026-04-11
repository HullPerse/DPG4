import { User } from "@/types/user";
import { client } from "./client.api";
import { useDataStore } from "@/store/data.store";
import { calculateMovePath } from "@/lib/cell.utils";
import CellApi from "./cell.api";

const cellApi = new CellApi();

export default class UserApi {
  private readonly usersCollection = client.collection("users");

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
          currentAction: "MOVE",
        })
        .then((res) => {
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
      fields: "id, username, avatar, color, money, position",
    });
  };

  //get all user positions
  getUserPositions = async (): Promise<User[]> => {
    return await this.usersCollection.getFullList({
      fields: "id, position, username, avatar, color",
    });
  };

  //get user by id
  getUserById = async (userId: string): Promise<User> => {
    return await this.usersCollection.getOne(userId);
  };

  changeUserAction = async (
    userId: string,
    action: "MOVE" | "GAMEADD" | "GAMEFINISH",
  ) => {
    await this.usersCollection.update(userId, { currentAction: action });
  };

  //move user
  moveUser = async (userId: string, newPosition: number) => {
    await this.usersCollection.update(userId, { position: newPosition });
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

    await this.usersCollection.update(userId, { position: finalPosition });
    await this.changeUserAction(userId, "GAMEADD");
  };

  scoreUser = async (userId: string, score: number) => {
    const currentScore = await this.usersCollection
      .getOne(userId, {
        fields: "money",
      })
      .then((res) => res.money);

    return await this.usersCollection.update(userId, {
      money: currentScore + score,
    });
  };
}
