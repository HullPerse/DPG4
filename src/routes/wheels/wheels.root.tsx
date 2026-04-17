import { Button } from "@/components/ui/button.component";
import { ChevronLeft } from "lucide-react";
import { useCallback, useState } from "react";
import HomeWheel from "./tabs/home.tab";
import UsersWheel from "./tabs/users.tab";
import CustomWheel from "./tabs/custom.tab";
import UserGamesTab from "./tabs/userGames.tab";
import UserItemsTab from "./tabs/userItems.tab";

export default function Wheels() {
  const [tab, setTab] = useState<
    "home" | "users" | "userGames" | "userItems" | "custom"
  >("home");

  const [values, setValues] = useState<string[]>([]);
  const [selected, setSelected] = useState<number>(0);
  const [selectedFilter, setSelectedFilter] = useState<number>(0);
  const [filters, setFilters] = useState<string[]>([]);

  const getComponent = useCallback(() => {
    const tabMap = {
      home: <HomeWheel setTab={setTab} />,
      users: <UsersWheel />,
      userGames: (
        <UserGamesTab
          selected={selected}
          values={values}
          setValues={setValues}
          setFilters={setFilters}
          filters={filters}
          selectedFilter={selectedFilter}
        />
      ),
      userItems: (
        <UserItemsTab
          selected={selected}
          values={values}
          setValues={setValues}
        />
      ),
      custom: <CustomWheel />,
    };

    return tabMap[(tab as keyof typeof tabMap) ?? "home"];
  }, [tab, selected, selectedFilter]);

  return (
    <main className="flex h-full w-full flex-col p-2">
      {tab !== "home" && (
        <section className="flex flex-row gap-1 items-center w-full min-h-11">
          <div className="flex flex-col w-full gap-2">
            <div className="flex flex-wrap h-fit min-h-11 gap-2">
              {values?.map((v, i) => (
                <span
                  className="bg-background h-10 min-w-32 w-fit border-2 border-highlight-high p-1 items-center justify-center flex font-bold
               opacity-65 hover:opacity-100 hover:cursor-pointer data-[selected=true]:text-primary data-[selected=true]:border-primary"
                  data-selected={i === selected}
                  onClick={() => setSelected(i)}
                >
                  {v}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap h-fit min-h-11 gap-2">
              {values &&
                filters &&
                filters?.map((f, i) => (
                  <span
                    className="bg-background h-10 min-w-32 w-fit border-2 border-highlight-high p-1 items-center justify-center flex font-bold
               opacity-65 hover:opacity-100 hover:cursor-pointer data-[selected-filter=true]:text-primary data-[selected-filter=true]:border-primary"
                    data-selected-filter={i === selectedFilter}
                    onClick={() => setSelectedFilter(i)}
                  >
                    {f}
                  </span>
                ))}
            </div>
          </div>

          <Button
            variant="error"
            size="icon"
            className="h-10 w-10 p-5 ml-auto"
            onClick={() => {
              setValues([]);
              setFilters([]);
              setSelected(0);
              setSelectedFilter(0);

              setTab("home");
            }}
          >
            <ChevronLeft />
          </Button>
        </section>
      )}
      <section className="flex flex-col gap-2 items-center overflow-y-auto w-full h-full">
        {getComponent()}
      </section>
    </main>
  );
}
