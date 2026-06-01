import { Button } from "@/components/ui/button.component";
import { Dices } from "lucide-react";
import { memo } from "react";

function HomeTab({
  setTab,
}: {
  setTab: (tab: "home" | "dice") => void;
}) {
  const tabs = [
    {
      value: "dice" as const,
      label: "Кости",
      description: "Классическая игра в кости. Брось три кубика и выиграй!",
      icon: <Dices className="size-10" />,
    },
  ];

  return (
    <main className="flex flex-col w-full h-full gap-2 items-center p-2">
      <section className="flex flex-col gap-2 items-center overflow-y-auto w-full h-full">
        {tabs.map((tab) => (
          <Button
            variant="ghost"
            key={tab.value}
            className="w-full h-18 border-2 border-highlight-high flex flex-row items-center justify-start"
            onClick={() => setTab(tab.value)}
          >
            {tab.icon}
            <div className="flex flex-col w-full items-start overflow-hidden">
              <span className="ml-2 font-bold text-xl">{tab.label}</span>
              <span className="ml-2 text-sm font-light text-muted truncate line-clamp-1">
                {tab.description}
              </span>
            </div>
          </Button>
        ))}
      </section>
    </main>
  );
}

export default memo(HomeTab);
