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
import { ChevronDown, ChevronLeft, User } from "lucide-react";
import { useState } from "react";

export default function Library() {
  const user = useUserStore((state) => state.user);
  const userProfile = useDataStore((state) => state.userProfile);
  const setUserProfile = useDataStore((state) => state.setUserProfile);

  const [tab, setTab] = useState<LibraryTabs>("library");

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
                onClick={() => setTab(item.value as LibraryTabs)}
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
                onClick={() => setTab("profile")}
                disabled={tab === "profile"}
              >
                <User className="size-4" />
                <span>{user?.username}</span>
                <ChevronDown className="size-3" />
              </Button>
            </HoverCardTrigger>
            <HoverCardContent className="z-10000 flex flex-col gap-1">
              <Button
                variant="link"
                className="text-text hover:bg-text/20 disabled:bg-text/20 disabled:text-primary disabled:opacity-85"
                disabled={tab === "profile"}
                onClick={() => setTab("profile")}
              >
                Профиль
              </Button>
              <Button
                variant="link"
                className="text-text hover:bg-text/20 disabled:bg-text/20 disabled:text-primary disabled:opacity-85"
                disabled={tab === "inventory"}
                onClick={() => setTab("inventory")}
              >
                Инвентарь
              </Button>
              <Button
                variant="link"
                className="text-text hover:bg-text/20 disabled:bg-text/20 disabled:text-primary disabled:opacity-85"
                disabled={tab === "friends"}
                onClick={() => setTab("friends")}
              >
                Друзья
              </Button>
            </HoverCardContent>
          </HoverCard>
        </div>
      </section>
      {/* body*/}
      <section className="flex h-full w-full">
        {libraryTabs.find((item) => item.value === tab)?.component}
      </section>
    </main>
  );
}
