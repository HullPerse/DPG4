import { User } from "@/types/user";
import { client } from "./client.api";

export default class UserApi {
  private readonly usersCollection = client.collection("users");

  //create new user
  create = async (data: User) => {
    try {
      await this.usersCollection
        .create({
          ...data,
          passwordConfirm: data.password,
          email: `${data.username}@gmail.com`,
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
}
