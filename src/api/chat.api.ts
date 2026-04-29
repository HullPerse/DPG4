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
      filter: `(data.receiver.id = "${receiver}" && data.sender.id = "${sender}") || (data.receiver.id = "${sender}" && data.sender.id = "${receiver}")`,
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

    const isGlobal = receiver === "global";
    const receiverUser = isGlobal ? null : await userApi.getUserById(receiver);

    await this.chatsCollection.create({
      data: {
        receiver: isGlobal
          ? {
              username: "Глобальный чат",
              id: "global",
              avatar: "🌐",
              color: "#f6c177",
            }
          : {
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

  getUnreadByReceiver = async (receiver: string): Promise<Chat[]> => {
    const allMessages: Promise<Chat[]> = this.chatsCollection.getFullList({
      filter: `data.receiver.id = "${receiver}" && isRead = False`,
    });

    return allMessages;
  };

  getUnreadGroupedBySender = async (
    receiver: string,
  ): Promise<{ sender: User; lastMessage: Chat; unreadCount: number }[]> => {
    const allMessages = (await this.chatsCollection.getFullList({
      filter: `data.receiver.id = "${receiver}" && isRead = False`,
      sort: "-created",
    })) as Chat[];

    const grouped = new Map<string, Chat[]>();

    for (const msg of allMessages) {
      const senderId = msg.data.sender.id;
      const existing = grouped.get(senderId) || [];
      existing.push(msg);
      grouped.set(senderId, existing);
    }

    const result: { sender: User; lastMessage: Chat; unreadCount: number }[] = [];

    for (const [senderId, messages] of grouped) {
      const senderUser = await userApi.getUserById(senderId);
      result.push({
        sender: senderUser as User,
        lastMessage: messages[0],
        unreadCount: messages.length,
      });
    }

    return result;
  };

  getUnread = async (receiver: string, sender: string) => {
    const allMessages = this.getChatByUser(sender, receiver);

    return (await allMessages).chat.filter((chat) => !chat.isRead);
  };

  marAllAsRead = async (messageIds: string[]) => {
    messageIds.forEach(async (id) => {
      await this.markAsRead(id);
    });
  };

  markAsRead = async (messageId: string) => {
    return await this.chatsCollection.update(messageId, {
      isRead: true,
    });
  };

  getGlobalChat = async (): Promise<Chat[]> => {
    const messages = (await this.chatsCollection.getFullList({
      filter: `data.receiver.id = "global"`,
      sort: "created",
    })) as Chat[];

    return messages;
  };
}
