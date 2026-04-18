import { useCallback, useState } from "react";
import HomeTab from "./tabs/home.tab";
import RulesTab from "./tabs/rules.tab";
import { Input } from "@/components/ui/input.component";
import { Button } from "@/components/ui/button.component";
import {
  Battery,
  Calendar,
  ChevronDown,
  ChevronLeft,
  Hash,
} from "lucide-react";
import ListTab from "./tabs/list.tab";
import ItemsTab from "./tabs/items.tab";
import MarketBrowser from "./tabs/market.tab";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover.component";

export type SortMethod = "name" | "date" | "charges";
export type SortDirection = "asc" | "desc";

const sortMethodIcons = {
  name: Hash,
  date: Calendar,
  charges: Battery,
};

const sortMethodLabels = {
  name: "По имени",
  date: "По дате",
  charges: "По зарядам",
};

export default function Browser() {
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [sortMethod, setSortMethod] = useState<SortMethod>("date");
  const [tab, setTab] = useState<"home" | "rules" | "list" | "items" | "store">(
    "home",
  );
  const [searchTerms, setSearchTerms] = useState<string>("");

  const getComponent = useCallback(() => {
    const tabMap = {
      home: <HomeTab setTab={setTab} searchTerms={searchTerms} />,
      rules: <RulesTab searchTerms={searchTerms} />,
      list: (
        <ListTab
          searchTerms={searchTerms}
          sortMethod={sortMethod}
          sortDirection={sortDirection}
          setSortMethod={setSortMethod}
          setSortDirection={setSortDirection}
        />
      ),
      items: <ItemsTab searchTerms={searchTerms} />,
      store: <MarketBrowser searchTerms={searchTerms} />,
    };

    return tabMap[(tab as keyof typeof tabMap) ?? "home"];
  }, [tab, searchTerms, sortMethod, sortDirection]);

  const SortMethodIcon = sortMethodIcons[sortMethod];

  return (
    <main className="flex h-full w-full flex-col p-2">
      <section className="flex flex-row gap-1 items-center w-full">
        <Input
          placeholder="Поиск вкладки"
          value={searchTerms}
          onChange={(e) => setSearchTerms(e.target.value)}
        />
        {tab === "list" && (
          <HoverCard>
            <HoverCardTrigger delay={0}>
              <Button
                variant="default"
                size="icon"
                className="text-text hover:bg-text/20 disabled:bg-text/20 disabled:text-primary disabled:opacity-85 flex gap-0 h-10 w-10 p-5"
              >
                <SortMethodIcon className="h-4 w-4" />
                <ChevronDown className="size-3" />
              </Button>
            </HoverCardTrigger>
            <HoverCardContent className="z-10000 flex flex-col gap-1">
              {Object.entries(sortMethodLabels).map(([method, label]) => (
                <Button
                  key={method}
                  variant={sortMethod === method ? "default" : "link"}
                  className="text-text hover:bg-text/20 disabled:bg-text/20 disabled:text-primary disabled:opacity-85"
                  onClick={() => {
                    if (sortMethod === method) {
                      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
                    } else {
                      setSortMethod(method as SortMethod);
                      setSortDirection("asc");
                    }
                  }}
                >
                  {label}
                  {sortMethod === method && (
                    <span className="ml-1">
                      {sortDirection === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </Button>
              ))}
            </HoverCardContent>
          </HoverCard>
        )}

        {tab !== "home" && (
          <Button
            variant="error"
            size="icon"
            className="h-10 w-10 p-5"
            onClick={() => setTab("home")}
          >
            <ChevronLeft />
          </Button>
        )}
      </section>
      <section className="flex flex-col gap-2 items-center overflow-y-auto w-full h-full">
        {getComponent()}
      </section>
    </main>
  );
}
