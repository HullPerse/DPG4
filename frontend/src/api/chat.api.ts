import { Chat } from "@/types/chat";
import { apiFetch } from "./client.api";
import { User } from "@/types/user";
import UserApi from "./user.api";
import { filePayload } from "@/lib/fileBlob";

const userApi = new UserApi();

export default class ChatApi {
  getChatByUser = async (
    sender: string,
    receiver: string,
  ): Promise<{ chat: Chat[]; user: User }> => {
    return apiFetch(`/chats/thread/${sender}/${receiver}`);
  };

  sendMessage = async (
    sender: string,
    receiver: string,
    message: string,
    image: File | null = null,
  ) => {
    const imagePayload =
      image instanceof File ? await filePayload(image) : null;

    return apiFetch("/chats", {
      method: "POST",
      body: {
        senderId: sender,
        receiverId: receiver,
        message,
        image: imagePayload,
      },
    });
  };

  removeMessage = async (messageId: string) =>
    apiFetch(`/chats/${messageId}`, { method: "DELETE" });

  updateMessage = async (messageId: string, newMessage: string) =>
    apiFetch(`/chats/${messageId}`, {
      method: "PATCH",
      body: { message: newMessage },
    });

  getUnreadByReceiver = async (receiver: string): Promise<Chat[]> =>
    apiFetch<Chat[]>(`/chats?unreadFor=${receiver}`);

  getUnreadGroupedBySender = async (receiver: string) => {
    const allMessages = await apiFetch<Chat[]>(
      `/chats?unreadFor=${receiver}&sort=-created`,
    );
    const grouped = new Map<string, Chat[]>();
    for (const msg of allMessages) {
      const senderId = msg.data.sender.id;
      const existing = grouped.get(senderId) || [];
      existing.push(msg);
      grouped.set(senderId, existing);
    }

    const result: { sender: User; lastMessage: Chat; unreadCount: number }[] =
      [];
    for (const [senderId, messages] of grouped) {
      const senderUser = await userApi.getUserById(senderId);
      result.push({
        sender: senderUser as User,
        lastMessage: messages[0]!,
        unreadCount: messages.length,
      });
    }
    return result;
  };

  getUnread = async (receiver: string, sender: string) => {
    const allMessages = await this.getChatByUser(sender, receiver);
    return allMessages.chat.filter((chat) => !chat.isRead);
  };

  marAllAsRead = async (messageIds: string[]) => {
    await apiFetch("/chats/mark-read", {
      method: "POST",
      body: { ids: messageIds },
    });
  };

  markAsRead = async (messageId: string) =>
    apiFetch(`/chats/${messageId}`, {
      method: "PATCH",
      body: { isRead: true },
    });

  getGlobalChat = async (): Promise<Chat[]> => {
    const messages = await apiFetch<Chat[]>(
      `/chats?receiverId=global&sort=created`,
    );
    return messages;
  };
}
