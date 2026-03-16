import { Button } from "@/components/ui/button.component";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover.component";
import { libraryTabs } from "@/config/library.config";
import { useUserStore } from "@/store/user.store";
import { LibraryTabs } from "@/types/library";
import { ChevronDown, User } from "lucide-react";
import { useState } from "react";

export default function Library() {
  const user = useUserStore((state) => state.user);

  const [tab, setTab] = useState<LibraryTabs>("library");

  return (
    <main className="flex flex-col w-full h-full">
      {/* header */}
      <section className="flex items-center justify-between h-12 px-4 bg-highlight-low border-b border-highlight-medium">
        <div className="flex flex-row gap-1">
          {libraryTabs.map((item) => (
            <Button
              key={item.value}
              variant="link"
              className="text-text hover:bg-text/20 disabled:bg-text/20 disabled:text-primary disabled:opacity-85"
              disabled={tab === item.value}
              onClick={() => setTab(item.value as LibraryTabs)}
            >
              {item.label}
            </Button>
          ))}
        </div>

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
      </section>
      {/* body*/}
      <section className="flex w-full h-full">
        {libraryTabs.find((item) => item.value === tab)?.component}
      </section>
    </main>
  );
}
