import { Chat } from "@/types/chat";
import { client } from "./client.api";
import { User } from "@/types/user";
import UserApi from "./user.api";

const userApi = new UserApi();

export default class ChatApi {
  private readonly chatsCollection = client.collection("chats");

  getChatByUser = async (
    sender: string,
    receiver: string,
  ): Promise<{ chat: Chat[]; user: User }> => {
    const chats = (await this.chatsCollection.getFullList({
      filter: `data.receiver.id = "${receiver}" && data.sender.id = "${sender}"`,
    })) as Chat[];

    const user = (await userApi.getUserById(receiver)) as User;

    if (chats.length === 0) {
      return { chat: [], user };
    }

    return { chat: chats, user };
  };
}
