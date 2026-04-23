import { useUserStore } from "@/store/user.store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback, startTransition } from "react";
import { Mail } from "lucide-react";
import ChatApi from "@/api/chat.api";
import { useSubscription } from "@/hooks/subscription.hook";

const chatApi = new ChatApi();

export default function MessagesDesktop() {
  const queryClient = useQueryClient();
  const user = useUserStore((state) => state.user);

  const [isOpen, setIsOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["unreadGrouped", user?.id],
    queryFn: async () => {
      return await chatApi.getUnreadGroupedBySender(String(user?.id));
    },
    enabled: !!user?.id,
  });

  const invalidateQuery = useCallback(() => {
    startTransition(() => {
      queryClient.invalidateQueries({
        queryKey: ["unreadGrouped", user?.id],
        refetchType: "all",
      });
    });
  }, [queryClient, user?.id]);

  useSubscription("chats", "*", invalidateQuery);

  return (
    <main className="relative">
      <button
        className={`relative flex items-center gap-1 hover:text-iris ${
          data && data.length > 0 ? "animate-pulse text-iris" : "text-muted"
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Mail className="h-4 w-4" />
        {data && data.length > 0 && (
          <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-iris text-[10px] text-white">
            {data.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 w-72 max-h-80 overflow-y-auto border-2 border-highlight-high bg-background shadow-sharp-sm">
          {isLoading ? (
            <div className="flex items-center justify-center p-4 text-muted">
              Загрузка...
            </div>
          ) : data && data.length > 0 ? (
            data.map((item) => (
              <button
                key={item.sender.id}
                className="flex w-full items-center gap-2 border-b border-highlight-high p-2 text-start hover:bg-background/80"
              >
                <div
                  className="flex size-8 min-w-8 items-center justify-center border border-highlight-high text-xl"
                  style={{
                    borderColor: item.sender.color,
                  }}
                >
                  {item.sender.avatar}
                </div>
                <div className="flex flex-1 flex-col overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="truncate font-bold">
                      {item.sender.username}
                    </span>
                    <span className="flex size-5 min-w-5 items-center justify-center rounded-full bg-iris text-xs text-white">
                      {item.unreadCount}
                    </span>
                  </div>
                  <span className="truncate text-xs text-muted">
                    {item.lastMessage.message || "[Изображение]"}
                  </span>
                </div>
              </button>
            ))
          ) : (
            <div className="flex items-center justify-center p-4 text-muted">
              Нет новых сообщений
            </div>
          )}
        </div>
      )}
    </main>
  );
}
