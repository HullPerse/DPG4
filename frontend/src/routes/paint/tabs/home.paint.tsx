import { Button } from "@/components/ui/button.component";

import { Book, Library, PlusCircle } from "lucide-react";

const TABS = ["draw", "profile", "list"];

function HomePaint({
  setTab,
}: {
  setTab: (tab: "draw" | "list" | "profile") => void;
}) {
  const getTab = (value: "draw" | "list" | "profile") => {
    const tabMap = {
      draw: {
        value: "draw",
        label: "Новый Рисунок",
        description: "Создать новый рисунок",
        icon: <PlusCircle className="size-10" />,
      },
      profile: {
        value: "profile",
        label: "Профиль",
        description: "Посмотреть мои рисунки",
        icon: <Book className="size-10" />,
      },
      list: {
        value: "list",
        label: "Архив",
        description: "Посмотреть все рисунки игроков",
        icon: <Library className="size-10" />,
      },
    };

    return tabMap[value as keyof typeof tabMap];
  };

  return (
    <main className="flex flex-col w-full h-full gap-2 items-center p-2">
      <section className="flex flex-col gap-2 items-center overflow-y-auto w-full h-full">
        {TABS.map((value) => {
          const tab = getTab(value as "draw" | "list" | "profile");

          return (
            <Button
              variant="ghost"
              key={value}
              className="w-full h-18 border-2 border-highlight-high flex flex-row items-center justify-start"
              onClick={() => setTab(tab.value as "draw" | "list" | "profile")}
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

export default HomePaint;
