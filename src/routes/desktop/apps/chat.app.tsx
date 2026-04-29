import { useUserStore } from "@/store/user.store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { NetworkIcon, Send, X, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button.component";
import { Input } from "@/components/ui/input.component";
import ChatBubble from "@/components/shared/bubble.component";
import ImageComponent from "@/components/shared/image.component";

const chatApi = new ChatApi();

const GLOBAL_CHAT_ID = "global";

export default function GlobalChatApp() {
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
    queryKey: ["global-chat"],
    queryFn: async (): Promise<{ chat: Chat[] }> => {
      const allMessages = await chatApi.getGlobalChat();
      return { chat: allMessages };
    },
    enabled: !!user?.id,
  });

  const isInitialLoad = useMemo(
    () => isLoading || (isFetching && !initialRef.current),
    [isLoading, isFetching],
  );

  const invalidateQuery = useCallback(() => {
    startTransition(() => {
      queryClient.invalidateQueries({
        queryKey: ["global-chat"],
        refetchType: "active",
      });
    });
  }, [queryClient]);

  useSubscription("chats", "*", invalidateQuery);

  useEffect(() => {
    if (!isLoading && !isFetching) {
      initialRef.current = true;
    }
  }, [isLoading, isFetching]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
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
      await chatApi.sendMessage(
        String(user?.id),
        GLOBAL_CHAT_ID,
        newMessage,
        image,
      );

      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    } finally {
      setLoading(false);
      setNewMessage("");
      setImage(null);
      invalidateQuery();
    }
  }, [newMessage, image, loading, invalidateQuery]);

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
    <main className="flex flex-col h-full w-full">
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
        className="flex flex-col w-full border-t-2 border-highlight-high p-2"
        hidden={!editMessage}
      >
        <div className="flex flex-row items-center gap-2">
          <Input
            className="flex-1 h-8"
            value={String(editMessage)}
            onChange={(e) => setEditMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleEdit();
              if (e.key === "Escape") {
                setEditId(null);
                setEditMessage(null);
              }
            }}
            autoFocus
          />
          <Button variant="success" size="icon" onClick={handleEdit}>
            <Send className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="error"
            onClick={() => {
              setEditId(null);
              setEditMessage(null);
            }}
          >
            <X className="size-4" />
          </Button>
        </div>
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
            placeholder="Напишите сообщение..."
            value={newMessage}
            disabled={loading || !!editId}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newMessage.trim()) {
                handleSend();
              }
            }}
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
