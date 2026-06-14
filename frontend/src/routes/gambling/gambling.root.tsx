import { Button } from "@/components/ui/button.component";
import { ChevronLeft, Trophy, BarChart3 } from "lucide-react";
import { useCallback, useState, lazy, Suspense } from "react";
import { WindowLoader } from "@/components/shared/loader.component";
const CassaTab = lazy(() => import("./tabs/cassa.tab"));
const DiceTab = lazy(() => import("./tabs/dice.tab"));
const BlackjackTab = lazy(() => import("./tabs/blackjack.tab"));
const RocketTab = lazy(() => import("./tabs/rocket.tab"));
const PachinkoTab = lazy(() => import("./tabs/pachinko.tab"));
const LeaderboardTab = lazy(() => import("./tabs/leaderboard.tab"));
const StatsTab = lazy(() => import("./tabs/stats.tab"));
const MinesTab = lazy(() => import("./tabs/mines.tab"));
const JackpotTab = lazy(() => import("./tabs/jackpot.tab"));
import HomeTab from "./tabs/home.tab";

type Tab =
  | "home"
  | "cassa"
  | "dice"
  | "blackjack"
  | "rocket"
  | "pachinko"
  | "leaderboard"
  | "stats"
  | "mines"
  | "jackpot";

export default function Gambling() {
  const [tab, setTab] = useState<Tab>("home");

  const getComponent = useCallback(() => {
    const tabMap: Record<Tab, React.ReactNode> = {
      home: <HomeTab setTab={setTab} />,
      cassa: <CassaTab />,
      dice: <DiceTab />,
      blackjack: <BlackjackTab />,
      rocket: <RocketTab />,
      pachinko: <PachinkoTab />,
      leaderboard: <LeaderboardTab />,
      stats: <StatsTab />,
      mines: <MinesTab />,
      jackpot: <JackpotTab />,
    };
    return tabMap[tab];
  }, [tab]);

  return (
    <main className="flex h-full w-full flex-col p-2">
      {tab !== "home" && (
        <section className="flex flex-row gap-1 items-center min-h-11 ml-auto">
          <Button
            rendered={["home", "cassa", "stats", "leaderboard"].includes(tab)}
            size="icon"
            className="h-10 w-10 p-5"
            onClick={() => setTab("leaderboard")}
            title="Лидерборд"
            disabled={tab === "leaderboard"}
          >
            <Trophy />
          </Button>
          <Button
            rendered={["home", "cassa", "stats", "leaderboard"].includes(tab)}
            size="icon"
            className="h-10 w-10 p-5"
            onClick={() => setTab("stats")}
            title="Статистика"
            disabled={tab === "stats"}
          >
            <BarChart3 />
          </Button>
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
        <Suspense fallback={<WindowLoader />}>{getComponent()}</Suspense>
      </section>
    </main>
  );
}
