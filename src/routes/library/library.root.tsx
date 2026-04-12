import { Button } from "@/components/ui/button.component";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover.component";
import { libraryTabs } from "@/config/library.config";
import { useDataStore } from "@/store/data.store";
import { useUserStore } from "@/store/user.store";
import { LibraryTabs } from "@/types/library";
import { ChevronDown, ChevronLeft, MailWarning, User } from "lucide-react";
import { startTransition, useCallback, useEffect, useState } from "react";
import ProfileTab from "./tabs/profile.tab";
import { useSubscription } from "@/hooks/subscription.hook";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ChatApi from "@/api/chat.api";
import { Chat } from "@/types/chat";
import { SmallLoader } from "@/components/shared/loader.component";
const chatApi = new ChatApi();

export default function Library() {
  const queryClient = useQueryClient();

  const user = useUserStore((state) => state.user);
  const userProfile = useDataStore((state) => state.userProfile);
  const setUserProfile = useDataStore((state) => state.setUserProfile);

  const [tab, setTab] = useState<LibraryTabs>("library");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["getUnread"],
    queryFn: async (): Promise<Chat[]> => {
      return await chatApi.getUnreadByReceiver(String(user?.id));
    },
  });

  const invalidateQuery = useCallback(() => {
    startTransition(() => {
      queryClient.invalidateQueries({
        queryKey: ["getUnread"],
        refetchType: "active",
      });
    });
  }, [queryClient]);

  useSubscription("chats", "*", invalidateQuery);

  //so it doesnt open specific user profile on load
  useEffect(() => {
    setUserProfile(null);
  }, []);

  const unreadAmmount = () => {
    if (isLoading) return <SmallLoader className="text-primary size-4" />;
    if (isError) return <MailWarning className="text-primary size-4" />;

    if (data?.length)
      return (
        <span className="text-primary animate-pulse">[{data.length}]</span>
      );
  };

  return (
    <main className="flex h-full w-full flex-col">
      {/* header */}
      <section className="flex h-12 min-h-12 items-center justify-between border-b border-highlight-medium bg-highlight-low px-4">
        <div className="flex flex-row gap-2">
          {libraryTabs
            .filter((item) => item.show)
            .map((item) => (
              <Button
                key={item.value}
                variant="link"
                className="text-text hover:bg-text/20 disabled:bg-text/20 disabled:text-primary disabled:opacity-85 shadow-sharp-sm border"
                disabled={tab === item.value}
                onClick={() => {
                  setUserProfile(null);
                  setTab(item.value as LibraryTabs);
                }}
              >
                {item.label}
              </Button>
            ))}
        </div>
        <div className="flex flex-row gap-2">
          {userProfile && (
            <Button
              variant="error"
              size="icon"
              onClick={() => setUserProfile(null)}
            >
              <ChevronLeft className="size-4" />
            </Button>
          )}

          <HoverCard>
            <HoverCardTrigger delay={0}>
              <Button
                variant="link"
                className="text-text hover:bg-text/20 disabled:bg-text/20 disabled:text-primary disabled:opacity-85"
                onClick={() => {
                  setUserProfile(null);
                  setTab("profile");
                }}
                disabled={tab === "profile"}
              >
                <User className="size-4" />
                <div className="flex flex-row items-center">
                  <span className="mr-1">{user?.username}</span>

                  {unreadAmmount()}
                </div>
                <ChevronDown className="size-3" />
              </Button>
            </HoverCardTrigger>
            <HoverCardContent className="z-10000 flex flex-col gap-1">
              <Button
                variant="link"
                className="text-text hover:bg-text/20 disabled:bg-text/20 disabled:text-primary disabled:opacity-85"
                disabled={tab === "profile"}
                onClick={() => {
                  setUserProfile(null);
                  setTab("profile");
                }}
              >
                Профиль
              </Button>
              <Button
                variant="link"
                className="text-text hover:bg-text/20 disabled:bg-text/20 disabled:text-primary disabled:opacity-85"
                disabled={tab === "inventory"}
                onClick={() => {
                  setUserProfile(null);
                  setTab("inventory");
                }}
              >
                Инвентарь
              </Button>
              <Button
                variant="link"
                className="text-text hover:bg-text/20 disabled:bg-text/20 disabled:text-primary disabled:opacity-85 flex flex-row gap-1"
                disabled={tab === "friends"}
                onClick={() => {
                  setUserProfile(null);
                  setTab("friends");
                }}
              >
                <div className="flex flex-row">
                  <span className="mr-1"> Друзья</span>
                  <span className="animate-pulse text-primary">
                    [{data?.length}]
                  </span>
                </div>
              </Button>
            </HoverCardContent>
          </HoverCard>
        </div>
      </section>
      {/* body*/}
      <section className="flex h-full w-full">
        {userProfile ? (
          <ProfileTab id={userProfile} />
        ) : (
          libraryTabs.find((item) => item.value === tab)?.component
        )}
      </section>
    </main>
  );
}
