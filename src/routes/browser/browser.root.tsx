import { useCallback, useState } from "react";
import HomeTab from "./tabs/home.tab";
import RulesTab from "./tabs/rules.tab";
import { Input } from "@/components/ui/input.component";
import { Button } from "@/components/ui/button.component";
import { ChevronLeft } from "lucide-react";
import ListTab from "./tabs/list.tab";
import ItemsTab from "./tabs/items.tab";
import MarketBrowser from "./tabs/market.tab";

export default function Browser() {
  const [tab, setTab] = useState<"home" | "rules" | "list" | "items" | "store">(
    "home",
  );
  const [searchTerms, setSearchTerms] = useState<string>("");

  const getComponent = useCallback(() => {
    const tabMap = {
      home: <HomeTab setTab={setTab} searchTerms={searchTerms} />,
      rules: <RulesTab searchTerms={searchTerms} />,
      list: <ListTab searchTerms={searchTerms} />,
      items: <ItemsTab searchTerms={searchTerms} />,
      store: <MarketBrowser searchTerms={searchTerms} />,
    };

    return tabMap[(tab as keyof typeof tabMap) ?? "home"];
  }, [tab, searchTerms]);

  return (
    <main className="flex h-full w-full flex-col p-2">
      <section className="flex flex-row gap-1 items-center w-full">
        <Input
          placeholder="Поиск вкладки"
          value={searchTerms}
          onChange={(e) => setSearchTerms(e.target.value)}
        />
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
