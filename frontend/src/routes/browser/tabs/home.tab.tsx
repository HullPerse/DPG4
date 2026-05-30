import { Button } from "@/components/ui/button.component";
import {
  BookOpenText,
  ShoppingBag,
  ShoppingCart,
  Boxes,
  Megaphone,
  Shuffle,
} from "lucide-react";
import { memo } from "react";

const TABS = ["items", "store", "randomStore", "rules", "list", "ads"];

function HomeBrowser({
  setTab,
  searchTerms,
}: {
  setTab: (
    tab: "home" | "rules" | "items" | "store" | "list" | "ads" | "randomStore",
  ) => void;
  searchTerms: string;
}) {
  const getTab = (
    value: "rules" | "items" | "store" | "list" | "ads" | "randomStore",
  ) => {
    const tabMap = {
      rules: {
        value: "rules",
        label: "ВИКИПЕДИЯ",
        description: "Сводка правил",
        icon: <BookOpenText className="size-10" />,
      },
      items: {
        value: "items",
        label: "МАГАЗИН",
        description: "Магазин покупки предметов",
        icon: <ShoppingCart className="size-10" />,
      },
      randomStore: {
        value: "randomStore",
        label: "Лавка",
        description: "Магазин случайных предметов",
        icon: <Shuffle className="size-10" />,
      },
      store: {
        value: "store",
        label: "АВИТО",
        description: "Магазин покупки б/у предметов",
        icon: <ShoppingBag className="size-10" />,
      },
      list: {
        value: "list",
        label: "ПРЕДМЕТЫ",
        description: "Список всех предметов",
        icon: <Boxes className="size-10" />,
      },
      ads: {
        value: "ads",
        label: "РЕКЛАМА",
        description: "Заказать рекламу",
        icon: <Megaphone className="size-10" />,
      },
    };

    return tabMap[value as keyof typeof tabMap];
  };

  return (
    <main className="flex flex-col w-full h-full gap-2 items-center p-2">
      <section className="flex flex-col gap-2 items-center overflow-y-auto w-full h-full">
        {TABS.filter((value) =>
          getTab(value as "rules" | "items" | "randomStore" | "store" | "list")
            .label.toUpperCase()
            .includes(searchTerms.toUpperCase()),
        ).map((value) => {
          const tab = getTab(
            value as "rules" | "items" | "store" | "randomStore",
          );

          return (
            <Button
              variant="ghost"
              key={value}
              className="w-full h-18 border-2 border-highlight-high flex flex-row items-center justify-start"
              onClick={() =>
                setTab(tab.value as "rules" | "items" | "randomStore" | "store")
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

export default memo(HomeBrowser);
