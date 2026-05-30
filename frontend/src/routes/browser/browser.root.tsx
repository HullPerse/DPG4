import { lazy, Suspense, useState } from "react";
import { Input } from "@/components/ui/input.component";
import { Button } from "@/components/ui/button.component";
import {
  Battery,
  Calendar,
  ChevronDown,
  ChevronLeft,
  Hash,
  Section,
} from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover.component";
import { WindowLoader } from "@/components/shared/loader.component";

const HomeTab = lazy(() => import("./tabs/home.tab"));
const RulesTab = lazy(() => import("./tabs/rules.tab"));
const ListTab = lazy(() => import("./tabs/list.tab"));
const ItemsTab = lazy(() => import("./tabs/items.tab"));
const MarketBrowser = lazy(() => import("./tabs/market.tab"));
const AdvertisementTab = lazy(() => import("./tabs/advertisement.tab"));
const StoreTab = lazy(() => import("./tabs/store.tab"));

export type SortMethod = "name" | "date" | "charges" | "type";
export type SortDirection = "asc" | "desc";

const sortMethodIcons = {
  name: Hash,
  date: Calendar,
  charges: Battery,
  type: Section,
};

const sortMethodLabels = {
  name: "По имени",
  date: "По дате",
  charges: "По зарядам",
  type: "По типу",
};

type BrowserTab =
  | "home"
  | "rules"
  | "list"
  | "items"
  | "store"
  | "ads"
  | "randomStore";

function BrowserTabContent({
  tab,
  searchTerms,
  setTab,
  sortMethod,
  sortDirection,
  setSortMethod,
  setSortDirection,
}: {
  tab: BrowserTab;
  searchTerms: string;
  setTab: (tab: BrowserTab) => void;
  sortMethod: SortMethod;
  sortDirection: SortDirection;
  setSortMethod: (method: SortMethod) => void;
  setSortDirection: (direction: SortDirection) => void;
}) {
  switch (tab) {
    case "home":
      return <HomeTab setTab={setTab} searchTerms={searchTerms} />;
    case "rules":
      return <RulesTab searchTerms={searchTerms} />;
    case "list":
      return (
        <ListTab
          searchTerms={searchTerms}
          sortMethod={sortMethod}
          sortDirection={sortDirection}
          setSortMethod={setSortMethod}
          setSortDirection={setSortDirection}
        />
      );
    case "items":
      return <ItemsTab searchTerms={searchTerms} />;
    case "store":
      return <MarketBrowser searchTerms={searchTerms} />;
    case "ads":
      return <AdvertisementTab />;
    case "randomStore":
      return <StoreTab />;
    default:
      return <HomeTab setTab={setTab} searchTerms={searchTerms} />;
  }
}

export default function Browser() {
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [sortMethod, setSortMethod] = useState<SortMethod>("date");
  const [tab, setTab] = useState<BrowserTab>("home");
  const [searchTerms, setSearchTerms] = useState<string>("");

  const SortMethodIcon = sortMethodIcons[sortMethod];

  return (
    <main className="flex h-full w-full flex-col p-2">
      <section className="flex flex-row gap-1 items-center w-full">
        {tab !== "ads" && (
          <Input
            placeholder="Поиск вкладки"
            value={searchTerms}
            onChange={(e) => setSearchTerms(e.target.value)}
          />
        )}
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
            className="h-10 w-10 p-5 ml-auto"
            onClick={() => setTab("home")}
          >
            <ChevronLeft />
          </Button>
        )}
      </section>
      <section className="flex flex-col gap-2 items-center overflow-y-auto w-full h-full">
        <Suspense fallback={<WindowLoader />}>
          <BrowserTabContent
            tab={tab}
            searchTerms={searchTerms}
            setTab={setTab}
            sortMethod={sortMethod}
            sortDirection={sortDirection}
            setSortMethod={setSortMethod}
            setSortDirection={setSortDirection}
          />
        </Suspense>
      </section>
    </main>
  );
}
