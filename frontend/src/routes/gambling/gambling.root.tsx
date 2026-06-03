import { Button } from "@/components/ui/button.component";
import { ChevronLeft } from "lucide-react";
import { useCallback, useState, lazy, Suspense } from "react";
import HomeTab from "./tabs/home.tab";
const DiceTab = lazy(() => import("./tabs/dice.tab"));
const BlackjackTab = lazy(() => import("./tabs/blackjack.tab"));
const RocketTab = lazy(() => import("./tabs/rocket.tab"));
const PachinkoTab = lazy(() => import("./tabs/pachinko.tab"));

export default function Gambling() {
  const [tab, setTab] = useState<"home" | "dice" | "blackjack" | "rocket" | "pachinko">("home");

  const getComponent = useCallback(() => {
    const tabMap = {
      home: <HomeTab setTab={setTab} />,
      dice: <DiceTab />,
      blackjack: <BlackjackTab />,
      rocket: <RocketTab />,
      pachinko: <PachinkoTab />,
    };
    return tabMap[tab];
  }, [tab]);

  return (
    <main className="flex h-full w-full flex-col p-2">
      {tab !== "home" && (
        <section className="flex flex-row gap-1 items-center w-full min-h-11">
          <Button
            variant="error"
            size="icon"
            className="h-10 w-10 p-5"
            onClick={() => setTab("home")}
          >
            <ChevronLeft />
          </Button>
        </section>
      )}
      <section className="flex flex-col gap-2 items-center overflow-y-auto w-full h-full">
        <Suspense fallback={null}>
          {getComponent()}
        </Suspense>
      </section>
    </main>
  );
}
