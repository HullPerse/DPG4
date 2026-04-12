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

  sendMessage = async (
    sender: string,
    receiver: string,
    message: string,
    image: File | null = null,
  ) => {
    const senderUser = await userApi.getUserById(sender);
    const receiverUser = await userApi.getUserById(receiver);

    await this.chatsCollection.create({
      data: {
        receiver: {
          username: receiverUser?.username ?? "",
          id: receiver,
          avatar: receiverUser?.avatar ?? "",
          color: receiverUser?.color ?? "",
        },
        sender: {
          username: senderUser?.username ?? "",
          id: sender,
          avatar: senderUser?.avatar ?? "",
          color: senderUser?.color ?? "",
        },
      },
      message: message,
      image: image,
    });
  };

  removeMessage = async (messageId: string) => {
    return await this.chatsCollection.delete(messageId);
  };

  updateMessage = async (messageId: string, newMessage: string) => {
    await this.chatsCollection.update(messageId, {
      message: newMessage,
    });
  };
}
