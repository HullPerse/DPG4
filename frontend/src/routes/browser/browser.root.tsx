import { lazy, Suspense, useState } from "react";
import { Input } from "@/components/ui/input.component";
import { useDebounce } from "@/hooks/debounce.hook";
import { Button } from "@/components/ui/button.component";
import { Battery, Calendar, ChevronDown, ChevronLeft, Hash, Section } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover.component";
import { WindowLoader } from "@/components/shared/loader.component";
import { SortDirection, SortMethod, sortMethodLabels } from "@/lib/sorting.utils";
const sortMethodIcons = {
  name: Hash,
  date: Calendar,
  charges: Battery,
  type: Section,
};

const HomeTab = lazy(() => import("./tabs/home.tab"));
const RulesTab = lazy(() => import("./tabs/rules.tab"));
const ListTab = lazy(() => import("./tabs/list.tab"));
const ItemsTab = lazy(() => import("./tabs/items.tab"));
const MarketBrowser = lazy(() => import("./tabs/market.tab"));
const AdvertisementTab = lazy(() => import("./tabs/advertisement.tab"));
const StoreTab = lazy(() => import("./tabs/store.tab"));
const WordleTab = lazy(() => import("./tabs/wordle.tab"));
const TamagochiTab = lazy(() => import("./tabs/tamagochi.tab"));
const RatStoreTab = lazy(() => import("./tabs/ratStore.tab"));
const QuestsTab = lazy(() => import("./tabs/quests.tab"));

type BrowserTab =
  | "home"
  | "rules"
  | "list"
  | "items"
  | "store"
  | "ads"
  | "randomStore"
  | "wordle"
  | "tamagochi"
  | "ratStore"
  | "questsTab";

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
    case "wordle":
      return <WordleTab />;
    case "tamagochi":
      return <TamagochiTab />;
    case "ratStore":
      return <RatStoreTab />;
    case "questsTab":
      return <QuestsTab />;
    default:
      return <HomeTab setTab={setTab} searchTerms={searchTerms} />;
  }
}

export default function Browser() {
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [sortMethod, setSortMethod] = useState<SortMethod>("date");
  const [tab, setTab] = useState<BrowserTab>("home");
  const [searchTerms, setSearchTerms] = useState<string>("");
  const debouncedSearch = useDebounce(searchTerms, 300);

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
                    <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>
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
            onClick={() => {
              setTab("home");
              setSearchTerms("");
            }}
          >
            <ChevronLeft />
          </Button>
        )}
      </section>
      <section className="flex flex-col gap-2 items-center overflow-y-auto w-full h-full">
        <Suspense fallback={<WindowLoader />}>
          <BrowserTabContent
            tab={tab}
            searchTerms={debouncedSearch}
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
