import { useUserStore } from "@/store/user.store";
import { useDataStore } from "@/store/data.store";
import { Button } from "@/components/ui/button.component";
import { useRef, useCallback, useState, memo } from "react";
import { cn } from "@/lib/utils";
import { rollDiceDealer, rollDicePlayer, abortDice } from "@/api/gambling.api";
import DiceScene from "../components/scene.dice";
import { SmallLoader } from "@/components/shared/loader.component";
import { getResultColor } from "@/lib/gambling/dice.utils";
import { DiceResult } from "@/types/gamble";

const BIDS = [1, 2, 3, 5, 8, 10] as const;

function DiceTab() {
  const user = useUserStore((state) => state.user);
  const gamblingBanned = useDataStore((state) => state.gamblingBanned);
  const setGamblingBanned = useDataStore((state) => state.setGamblingBanned);

  const [rolling, setRolling] = useState(false);
  const [bid, setBid] = useState(3);
  const [gamePhase, setGamePhase] = useState<
    "idle" | "dealer" | "player" | "result"
  >("idle");

  const [dealerValues, setDealerValues] = useState<
    [number, number, number] | null
  >(null);
  const [playerValues, setPlayerValues] = useState<
    [number, number, number] | null
  >(null);
  const [dealerTarget, setDealerTarget] = useState<number | null>(null);
  const [result, setResult] = useState<DiceResult>(null);

  const [dealerThrowKey, setDealerThrowKey] = useState(0);
  const [playerThrowKey, setPlayerThrowKey] = useState(0);
  const [displayBalance, setDisplayBalance] = useState(user?.money ?? 0);

  const revealTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const waiterRef = useRef<{
    resolve: () => void;
    settled: Set<number>;
  } | null>(null);
  const autoRollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const balance = user?.money ?? 0;

  const waitForAllDice = useCallback(
    () =>
      new Promise<void>((resolve) => {
        waiterRef.current = { resolve, settled: new Set() };
        setTimeout(() => {
          if (waiterRef.current) {
            console.error("Dice settle timeout - forcing resolve");
            waiterRef.current.resolve();
            waiterRef.current = null;
          }
        }, 7000);
      }),
    [],
  );

  const makeSettleHandler = () => {
    return (_index: number) => {
      const waiter = waiterRef.current;
      if (!waiter) return;
      waiter.settled.add(_index);
      if (waiter.settled.size === 3) {
        waiter.resolve();
        waiterRef.current = null;
      }
    };
  };

  const startGame = async () => {
    if (!user || balance < bid || gamblingBanned) return;

    revealTimeoutsRef.current.forEach(clearTimeout);
    revealTimeoutsRef.current = [];
    if (autoRollTimerRef.current) clearTimeout(autoRollTimerRef.current);
    setResult(null);
    setDealerValues(null);
    setPlayerValues(null);
    setDealerTarget(null);
    setDisplayBalance(balance);
    setRolling(true);
    setGamePhase("dealer");

    try {
      await abortDice(String(user.id));
      const dealer = await rollDiceDealer(String(user.id), bid);

      setDealerValues(dealer.values);
      setDealerTarget(dealer.target);
      setDealerThrowKey((k) => k + 1);

      await waitForAllDice();

      setGamePhase("player");
      autoRollTimerRef.current = setTimeout(async () => {
        try {
          const result = await rollDicePlayer(String(user.id));

          setPlayerValues(result.playerValues);
          setPlayerThrowKey((k) => k + 1);

          await waitForAllDice();

          setDisplayBalance(result.balance);
          useUserStore.setState({
            user: { ...user, money: result.balance },
          });

          if (result.banned) {
            setGamblingBanned(true);
          }

          setResult({
            net: result.net,
            label: result.label,
            tone: result.tone,
          });
          setGamePhase("result");
          setRolling(false);
        } catch (e) {
          console.error("Player roll failed:", e);
          useUserStore.setState({
            user: { ...useUserStore.getState().user! },
          });
          setDisplayBalance(useUserStore.getState().user?.money ?? 0);
          setResult({
            net: 0,
            label: "Ошибка",
            tone: "chance",
          });
          setGamePhase("result");
          setRolling(false);
        }
      }, 1200);
    } catch (e) {
      console.error("Dealer roll failed:", e);
      useUserStore.setState({
        user: { ...useUserStore.getState().user! },
      });
      setDisplayBalance(useUserStore.getState().user?.money ?? 0);
      setResult({
        net: 0,
        label: "Ошибка сервера. Попробуй ещё раз.",
        tone: "chance",
      });
      setGamePhase("result");
      setRolling(false);
    }
  };

  const handleDealerSettled = dealerValues ? makeSettleHandler() : () => {};

  const handlePlayerSettled = playerValues ? makeSettleHandler() : () => {};

  const showDealerLabel = gamePhase !== "idle";

  return (
    <main className="flex h-full w-full flex-col items-center gap-2 p-2">
      {/*INFO*/}
      <section className="flex flex-col w-xl items-center gap-1 border-2 border-highlight-high bg-background px-2">
        <span className="text-lg font-bold">{displayBalance} чубриков</span>
      </section>
      {/*BID*/}
      <section className="flex w-xl items-center justify-center gap-1.5 border-2 border-highlight-high bg-background px-3 py-1.5">
        <span className="text-sm text-muted mr-1">Ставка</span>
        {BIDS.map((v) => (
          <button
            key={v}
            onClick={() => setBid(v)}
            disabled={rolling}
            className={cn(
              "min-w-8 h-8 rounded text-sm font-semibold transition-colors cursor-pointer",
              bid === v
                ? "bg-highlight-high text-background"
                : "bg-foreground/10 text-muted hover:bg-foreground/20",
              rolling && "opacity-40 pointer-events-none",
            )}
          >
            {v}
          </button>
        ))}
      </section>

      {/*DICE*/}
      <section className="relative w-full h-110 min-h-110 overflow-hidden border-2 border-highlight-high bg-background">
        <DiceScene
          dealerThrowKey={dealerThrowKey}
          playerThrowKey={playerThrowKey}
          dealerValues={dealerValues}
          playerValues={playerValues}
          dealerTarget={dealerTarget}
          onDealerSettled={handleDealerSettled}
          onPlayerSettled={handlePlayerSettled}
          showDealerLabel={showDealerLabel}
        />

        {result && (
          <span
            className={cn(
              "absolute bottom-0 left-1/2 -translate-x-1/2 text-center text-lg font-bold w-full",
              getResultColor(result),
            )}
          >
            {result.label} {result.net > 0 && <span>+{result.net}</span>}
            {result.net < 0 && <span>{result.net}</span>}
          </span>
        )}
      </section>
      {/*BUTTON AND RULES*/}
      <section className="flex flex-col mt-auto gap-1">
        <Button
          variant="info"
          className="w-xl"
          onClick={startGame}
          disabled={rolling || balance < bid || gamblingBanned}
        >
          {gamblingBanned ? (
            "Вы забанены"
          ) : rolling ? (
            <SmallLoader />
          ) : (
            `Кинуть (${bid})`
          )}
        </Button>

        <details className="w-xl border-2 border-highlight-high bg-background px-2 text-sm">
          <summary className="cursor-pointer font-semibold text-muted select-none">
            Правила
          </summary>
          <div className="mt-2 flex flex-col gap-2 pl-1">
            <div>
              <span className="font-semibold text-primary">Бросок дилера:</span>
              <ul className="flex flex-col gap-0.5 pl-2">
                <li className="flex justify-between">
                  <span>1·2·3</span>
                  <span className="text-emerald-400">Дилер проигрывает</span>
                </li>
                <li className="flex justify-between">
                  <span>4·5·6</span>
                  <span className="text-red-400">Дилер побеждает</span>
                </li>
                <li className="flex justify-between">
                  <span>Три одинаковых</span>
                  <span className="text-red-400">Дилер побеждает</span>
                </li>
                <li className="flex justify-between">
                  <span>1·1·1</span>
                  <span className="text-muted">Ничья</span>
                </li>
                <li className="flex justify-between">
                  <span>Пара + число</span>
                  <span className="text-muted">Цель = число</span>
                </li>
              </ul>
            </div>
            <div>
              <span className="font-semibold text-primary">Твой бросок:</span>
              <ul className="flex flex-col gap-0.5 pl-2">
                <li className="flex justify-between">
                  <span>4·5·6</span>
                  <span className="text-emerald-400">
                    +{Math.floor(bid * 1.5)}
                  </span>
                </li>
                <li className="flex justify-between">
                  <span>Три одинаковых</span>
                  <span className="text-emerald-400">+{bid * 2}</span>
                </li>
                <li className="flex justify-between">
                  <span>1·1·1</span>
                  <span className="text-amber-400">+{bid * 3} (джекпот)</span>
                </li>
                <li className="flex justify-between">
                  <span>1·2·3</span>
                  <span className="text-red-400">−{bid}</span>
                </li>
                <li className="flex justify-between">
                  <span>Пара → число &gt; цели</span>
                  <span className="text-emerald-400">+{bid}</span>
                </li>
                <li className="flex justify-between">
                  <span>Пара → число = цели</span>
                  <span className="text-muted">Ничья</span>
                </li>
                <li className="flex justify-between">
                  <span>Пара → число &lt; цели</span>
                  <span className="text-red-400">−{bid}</span>
                </li>
              </ul>
            </div>
          </div>
        </details>
      </section>
    </main>
  );
}

export default memo(DiceTab);
