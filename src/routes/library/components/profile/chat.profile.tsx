import { useUserStore } from "@/store/user.store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { User } from "@/types/user";
import {
  startTransition,
  useCallback,
  useRef,
  useEffect,
  useState,
  useMemo,
  ChangeEvent,
} from "react";
import { useSubscription } from "@/hooks/subscription.hook";
import { Chat } from "@/types/chat";
import ChatApi from "@/api/chat.api";
import {
  SmallLoader,
  WindowLoader,
} from "@/components/shared/loader.component";
import { WindowError } from "@/components/shared/error.component";
import { NetworkIcon, Send, X, Paperclip, Check } from "lucide-react";
import { Button } from "@/components/ui/button.component";
import { Input } from "@/components/ui/input.component";
import ChatBubble from "@/components/shared/bubble.component";
import ImageComponent from "@/components/shared/image.component";
import { getOnlineStatusColor } from "@/lib/utils";
import UserApi from "@/api/user.api";

const chatApi = new ChatApi();
const userApi = new UserApi();

export default function ChatProfile({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const user = useUserStore((state) => state.user);

  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [editMessage, setEditMessage] = useState<string | null>(null);
  const [editId, setEditId] = useState<Chat["id"] | null>(null);

  const [image, setImage] = useState<File | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const initialRef = useRef<boolean>(false);
  const endRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["chat", user?.id, id],
    queryFn: async (): Promise<{ user: User | null; chat: Chat[] }> => {
      return await chatApi.getChatByUser(String(user?.id), id);
    },
    enabled: !!user?.id && !!id,
  });

  const { data: chatUser } = useQuery({
    queryKey: ["user", id],
    queryFn: async () => {
      return await userApi.getUserById(id);
    },
    enabled: !!id,
  });

  const isInitialLoad = useMemo(
    () => isLoading || (isFetching && !initialRef.current),
    [isLoading, isFetching],
  );

  const invalidateQuery = useCallback(() => {
    startTransition(() => {
      queryClient.invalidateQueries({
        queryKey: ["chat", user?.id, id],
        refetchType: "active",
      });
    });
  }, [queryClient, user?.id, id]);

  useSubscription("users", "*", invalidateQuery);
  useSubscription("chats", "*", invalidateQuery);

  useEffect(() => {
    if (!isLoading && !isFetching) {
      initialRef.current = true;
    }
  }, [isLoading, isFetching]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
    handleReadAll();
    queryClient.invalidateQueries({
      queryKey: ["friendsTab"],
      refetchType: "all",
    });
    invalidateQuery();
  }, [data?.chat]);

  const handleReadAll = useCallback(async () => {
    const allIds = data?.chat
      .filter((item) => !item.isRead && item.data.sender.id !== user?.id)
      .map((item) => item.id);
    if (!allIds || allIds?.length === 0) return;

    await chatApi.marAllAsRead(allIds);
  }, [data?.chat]);

  const handleAttachement = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setImage(file);
      }
    },
    [setImage],
  );

  const handleEdit = useCallback(async () => {
    if (!editMessage?.trim() || !editId) return;

    await chatApi.updateMessage(editId, editMessage);
    setEditMessage(null);
    setEditId(null);
    invalidateQuery();
  }, [editMessage, editId, invalidateQuery]);

  const handleRemove = useCallback(async (e: string) => {
    setLoading(true);

    try {
      await chatApi.removeMessage(e);

      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    } finally {
      setLoading(false);
      invalidateQuery();
    }
  }, []);

  const handleSend = useCallback(async () => {
    if ((!newMessage.trim() && !image) || loading) return;

    setLoading(true);

    try {
      await chatApi.sendMessage(String(user?.id), id, newMessage, image);

      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    } finally {
      setLoading(false);
      setNewMessage("");
      setImage(null);
      invalidateQuery();
    }
  }, [newMessage, image, id, loading, invalidateQuery]);

  if (isInitialLoad) return <WindowLoader />;
  if (isError)
    return (
      <WindowError
        error={new Error("Произошла ошибка")}
        icon={<NetworkIcon />}
        refresh={refetch}
        button
      />
    );

  return (
    <main className="flex flex-col h-0 min-h-full w-full">
      <div className="flex items-center gap-2 px-2 py-1 border-b-2 border-highlight-high bg-highlight-low">
        <span
          className="w-3 h-3 rounded-full border border-highlight-high"
          style={{ backgroundColor: getOnlineStatusColor(chatUser?.online) }}
          title={chatUser?.online ? "Онлайн" : "Оффлайн"}
        />
        <span className="font-bold">{chatUser?.username}</span>
      </div>
      <div className="flex-1 w-full min-h-0 bg-background p-2 gap-4 overflow-y-auto">
        <section className="flex flex-col gap-2">
          {data?.chat.map((item) => (
            <ChatBubble
              key={item.id}
              item={item}
              currentUser={user}
              onRemove={(e) => {
                handleRemove(e.id);
              }}
              onEdit={(e) => {
                setEditId(e.id);
                setEditMessage(e.message);
              }}
            />
          ))}
          <div ref={endRef} />
        </section>
      </div>
      <section
        className="flex flex-row items-center gap-2 p-2 border-t-2 border-highlight-high"
        hidden={!editMessage}
      >
        <Input
          className="flex-1 h-8"
          value={String(editMessage)}
          onChange={(e) => setEditMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleEdit();
            if (e.key === "Escape") {
              setEditMessage(null);
              setNewMessage("");
            }
          }}
          autoFocus
        />
        <Button variant="success" size="icon" onClick={handleEdit}>
          <Check className="size-4" />
        </Button>
        <Button
          size="icon"
          variant="error"
          onClick={() => {
            setEditId(null);
            setEditMessage(null);
            setNewMessage("");
          }}
        >
          <X className="size-4" />
        </Button>
      </section>

      <section className="flex flex-col w-full border-t-2 border-highlight-high p-2">
        {image && (
          <div className="relative inline-block self-start min-w-20">
            <ImageComponent
              src={URL.createObjectURL(image)}
              alt="image preview"
              className="h-20 w-full border border-highlight-high"
              type="contain"
            />

            <Button
              variant="error"
              size="icon"
              className="absolute -top-2 -right-2 size-6"
              onClick={() => {
                setImage(null);

                if (imageInputRef.current) {
                  imageInputRef.current.value = "";
                }
              }}
            >
              <X />
            </Button>
          </div>
        )}

        <div className="flex flex-row items-center gap-1 min-h-10 h-10 max-h-10 overflow-hidden">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={handleAttachement}
            className="hidden"
          />
          <Button
            size="icon"
            variant="link"
            className="border border-highlight-high"
            onClick={() => imageInputRef.current?.click()}
            disabled={loading || !!editId}
          >
            <Paperclip />
          </Button>

          <Input
            className="w-full h-9"
            placeholder="Напишите сообщение"
            value={newMessage}
            disabled={loading || !!editId}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <Button
            size="icon"
            variant="success"
            onClick={handleSend}
            disabled={!newMessage || loading || !!editId}
          >
            {loading ? <SmallLoader /> : <Send />}
          </Button>
        </div>
      </section>
    </main>
  );
}
