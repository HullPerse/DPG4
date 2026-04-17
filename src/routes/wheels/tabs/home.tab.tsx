import { Button } from "@/components/ui/button.component";
import { Gamepad2, Pen, Swords, Users } from "lucide-react";
import { memo, ReactNode } from "react";

export const TABS = ["users", "userGames", "userItems", "custom"];

function HomeWheel({
  setTab,
}: {
  setTab: (
    tab: "home" | "users" | "userGames" | "userItems" | "custom",
  ) => void;
}) {
  const getTab = (value: "users" | "userGames" | "userItems" | "custom") => {
    const tabMap = {
      users: {
        value: "users",
        label: "Участники",
        description: "Колесо всех игроков",
        icon: <Users className="size-10" />,
      },
      userGames: {
        value: "userGames",
        label: "Игры участников",
        description: "Колесо игр всех игроков. Можно выбрать по статусу",
        icon: <Gamepad2 className="size-10" />,
      },
      userItems: {
        value: "userItems",
        label: "Предметы участников",
        description:
          "Колесо предметов всех игроков. Можно выбрать по участнику",
        icon: <Swords className="size-10" />,
      },
      custom: {
        value: "custom",
        label: "Своё колесоо",
        description: "Колесо со своими позициями",
        icon: <Pen className="size-10" />,
      },
    };

    return tabMap[value as keyof typeof tabMap];
  };

  return (
    <main className="flex flex-col w-full h-full gap-2 items-center p-2">
      <section className="flex flex-col gap-2 items-center overflow-y-auto w-full h-full">
        {TABS.map((value) => {
          const tab = getTab(
            value as "users" | "userGames" | "userItems" | "custom",
          ) as {
            value: string;
            label: string;
            description: string;
            icon: ReactNode;
          };

          return (
            <Button
              variant="ghost"
              key={value}
              className="w-full h-18 border-2 border-highlight-high flex flex-row items-center justify-start"
              onClick={() =>
                setTab(
                  tab.value as "users" | "userGames" | "userItems" | "custom",
                )
              }
            >
              {tab.icon}
              <div className="flex flex-col w-full items-start overflow-hidden">
                <span className="ml-2 font-bold text-xl">{tab.label}</span>
                <span className="ml-2 text-sm font-light text-muted truncate line-clamp-1">
                  {tab.description}
                </span>
              </div>
            </Button>
          );
        })}
      </section>
    </main>
  );
}

export default memo(HomeWheel);
