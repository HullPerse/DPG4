import { useUserStore } from "@/store/user.store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { User } from "@/types/user";
import { startTransition, useCallback } from "react";
import { useSubscription } from "@/hooks/subscription.hook";
import { Chat } from "@/types/chat";
import ChatApi from "@/api/chat.api";
import { WindowLoader } from "@/components/shared/loader.component";
import { WindowError } from "@/components/shared/error.component";
import { NetworkIcon, Send } from "lucide-react";
import { Button } from "@/components/ui/button.component";
import { Input } from "@/components/ui/input.component";

const chatApi = new ChatApi();

export default function ChatProfile({ id }: { id: string }) {
  const user = useUserStore((state) => state.user);

  const queryClient = useQueryClient();

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["reviewsTab"],
    queryFn: async (): Promise<{ user: User | null; chat: Chat[] }> => {
      return await chatApi.getChatByUser(String(user?.id), id);
    },
  });

  const invalidateQuery = useCallback(() => {
    startTransition(() => {
      queryClient.invalidateQueries({
        queryKey: ["reviewsTab"],
        refetchType: "all",
      });
    });
  }, [queryClient]);

  useSubscription("users", "*", invalidateQuery);
  useSubscription("chats", "*", invalidateQuery);

  if (isLoading || isFetching) return <WindowLoader />;
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
    <main className="flex flex-col w-full h-full">
      <section className="flex flex-col bg-background h-full w-full">
        {/* CHAT USER MESSAGE */}
        <div className="flex bg-red-500 self-start">123</div>
        {/* CHAT DATA.USER MESSAGE */}
        <div className="flex bg-red-500 self-start">321</div>
      </section>
      <section className="flex flex-row w-full mt-auto border-t-2 border-highlight-high p-2 items-center gap-1">
        <Input
          autoFocus
          className="w-full h-9"
          placeholder="Напишите сообщение"
        />
        <Button
          size="icon"
          variant="link"
          className="border border-highlight-high"
        >
          <Send />
        </Button>
      </section>
    </main>
  );
}
