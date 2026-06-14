import { Button } from "@/components/ui/button.component";
import {
  Dices,
  Club,
  Rocket,
  CircleDot,
  Trophy,
  BarChart3,
  Bomb,
  Ticket,
  Zap,
} from "lucide-react";
import { memo } from "react";

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

function HomeTab({ setTab }: { setTab: (tab: Tab) => void }) {
  const tabs = [
    {
      value: "cassa" as Tab,
      label: "Касса",
      description: "Купить и продать тикеты казино",
      icon: <Ticket className="size-10" />,
    },
    {
      value: "dice" as Tab,
      label: "Чинчирорин",
      description: "Кидай кубики и получи МНОГО чубриков",
      icon: <Dices className="size-10" />,
    },
    {
      value: "blackjack" as Tab,
      label: "Блэкджек",
      description: "fallout new vegas опять",
      icon: <Club className="size-10" />,
    },
    {
      value: "pachinko" as Tab,
      label: "Пачинко",
      description: "Крыса пачинко. ЖЕСТЬ КАК В КАЙДЖИ",
      icon: <CircleDot className="size-10" />,
    },
    {
      value: "rocket" as Tab,
      label: "Ракетник",
      description: "Крыса летит вверх - забери чубрики до краха",
      icon: <Rocket className="size-10" />,
    },
    {
      value: "mines" as Tab,
      label: "Минное поле",
      description: "Азартная игра с минами п̶о̶д̶ ̶К̶и̶е̶в̶о̶м̶ ",
      icon: <Bomb className="size-10" />,
    },
    {
      value: "jackpot" as Tab,
      label: "Джекпот",
      description: "1 к 1000 на сорвать банк!",
      icon: <Zap className="size-10" />,
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
        <section className="flex flex-row gap-2 w-full">
          <Button
            variant="ghost"
            className="flex-1 h-16 border-2 border-highlight-high flex flex-row items-center justify-center gap-2"
            onClick={() => setTab("leaderboard")}
          >
            <Trophy className="size-8" />
            <span className="font-bold text-lg">Лидерборд</span>
          </Button>
          <Button
            variant="ghost"
            className="flex-1 h-16 border-2 border-highlight-high flex flex-row items-center justify-center gap-2"
            onClick={() => setTab("stats")}
          >
            <BarChart3 className="size-8" />
            <span className="font-bold text-lg">Статистика</span>
          </Button>
        </section>
      </section>
    </main>
  );
}

export default memo(HomeTab);
