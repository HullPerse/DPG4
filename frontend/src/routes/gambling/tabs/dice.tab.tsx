import { useUserStore } from "@/store/user.store";
import { useDataStore } from "@/store/data.store";
import { Button } from "@/components/ui/button.component";
import { useRef, useCallback, useState, memo, useEffect } from "react";
import { flushSync } from "react-dom";
import { cn } from "@/lib/utils";
import {
  rollDiceDealer,
  rerollDiceDealer,
  rollDicePlayer,
  abortDice,
  fetchGamblingConfig,
} from "@/api/gambling.api";
import DiceScene from "../components/scene.dice";
import { SmallLoader } from "@/components/shared/loader.component";
import {
  getResultColor,
  DICE_SETTLE_HOLD_MS,
  DICE_REROLL_PAUSE_MS,
  DICE_PLAYER_AUTO_MS,
} from "@/lib/gambling/dice.utils";
import {
  DiceRollCoordinator,
  DiceRow,
} from "@/lib/gambling/diceRollCoordinator";
import { DiceDealerResult, DiceGameResult, DiceResult } from "@/types/gamble";

const FALLBACK_BID_OPTIONS = [1, 2, 3, 5, 8, 10, 15, 20, 30, 50];

function pause(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function DiceTab() {
  const user = useUserStore((state) => state.user);
  const gamblingBanned = useDataStore((state) => state.gamblingBanned);
  const setGamblingBanned = useDataStore((state) => state.setGamblingBanned);

  const [bidOptions, setBidOptions] = useState<number[]>(FALLBACK_BID_OPTIONS);
  const [rolling, setRolling] = useState(false);
  const [bid, setBid] = useState(3);

  useEffect(() => {
    fetchGamblingConfig().then((c) => setBidOptions(c.bidOptions));
  }, []);
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
  const [playerDiceActive, setPlayerDiceActive] = useState(false);
  const [displayBalance, setDisplayBalance] = useState(user?.money ?? 0);

  const rollCoordinatorRef = useRef(new DiceRollCoordinator());
  const dealerKeyRef = useRef(0);
  const playerKeyRef = useRef(0);
  const roundIdRef = useRef(0);

  const balance = user?.money ?? 0;

  useEffect(() => {
    return () => rollCoordinatorRef.current.cancel();
  }, []);

  const isRoundActive = (round: number) => round === roundIdRef.current;

  const handleDealerSettled = useCallback((index: number, throwKey: number) => {
    rollCoordinatorRef.current.notify("dealer", index, throwKey);
  }, []);

  const handlePlayerSettled = useCallback((index: number, throwKey: number) => {
    rollCoordinatorRef.current.notify("player", index, throwKey);
  }, []);

  const playDiceRoll = async (
    values: [number, number, number],
    row: DiceRow,
  ) => {
    const nextKey =
      row === "dealer" ? dealerKeyRef.current + 1 : playerKeyRef.current + 1;

    const settledPromise = rollCoordinatorRef.current.waitFor(row, nextKey);

    flushSync(() => {
      if (row === "dealer") {
        dealerKeyRef.current = nextKey;
        setDealerValues(values);
        setDealerThrowKey(nextKey);
      } else {
        playerKeyRef.current = nextKey;
        setPlayerValues(values);
        setPlayerThrowKey(nextKey);
        setPlayerDiceActive(true);
      }
    });

    await settledPromise;
    await pause(DICE_SETTLE_HOLD_MS);
  };

  const settleDealer = async (
    initial: DiceDealerResult,
    round: number,
  ): Promise<DiceDealerResult> => {
    let dealer = initial;

    await playDiceRoll(dealer.values, "dealer");
    if (!isRoundActive(round)) return dealer;

    while (dealer.reroll) {
      await pause(DICE_REROLL_PAUSE_MS);
      if (!isRoundActive(round)) return dealer;

      dealer = await rerollDiceDealer();
      if (!isRoundActive(round)) return dealer;

      await playDiceRoll(dealer.values, "dealer");
      if (!isRoundActive(round)) return dealer;
    }

    setDealerTarget(dealer.target);

    return dealer;
  };

  const settlePlayer = async (round: number): Promise<DiceGameResult> => {
    setGamePhase("player");

    let playerResult = await rollDicePlayer();
    if (!isRoundActive(round)) return playerResult;

    await playDiceRoll(playerResult.playerValues, "player");
    if (!isRoundActive(round)) return playerResult;

    while (playerResult.reroll) {
      await pause(DICE_REROLL_PAUSE_MS);
      if (!isRoundActive(round)) return playerResult;

      playerResult = await rollDicePlayer();
      if (!isRoundActive(round)) return playerResult;

      await playDiceRoll(playerResult.playerValues, "player");
      if (!isRoundActive(round)) return playerResult;
    }

    return playerResult;
  };

  const finishRound = (finalResult: DiceGameResult) => {
    setDisplayBalance(finalResult.balance);
    useUserStore.setState({
      user: { ...user!, money: finalResult.balance },
    });
    if (finalResult.banned) setGamblingBanned(true);
    setResult({
      net: finalResult.net,
      label: finalResult.label,
      tone: finalResult.tone,
    });
    setGamePhase("result");
    setRolling(false);
  };

  const failRound = (label: string) => {
    useUserStore.setState({
      user: { ...useUserStore.getState().user! },
    });
    setDisplayBalance(useUserStore.getState().user?.money ?? 0);
    setResult({ net: 0, label, tone: "chance" });
    setGamePhase("result");
    setRolling(false);
  };

  const resetDiceVisuals = () => {
    rollCoordinatorRef.current.cancel();
    setDealerValues(null);
    setPlayerValues(null);
    setPlayerDiceActive(false);
  };

  const startGame = async () => {
    if (!user || balance < bid || gamblingBanned || rolling) return;

    const round = ++roundIdRef.current;
    resetDiceVisuals();
    setResult(null);
    setDealerTarget(null);
    setDisplayBalance(balance);
    setRolling(true);
    setGamePhase("dealer");

    try {
      await abortDice();
      if (!isRoundActive(round)) return;

      const dealerInitial = await rollDiceDealer(bid);
      if (!isRoundActive(round)) return;

      setDisplayBalance(balance - bid);

      const dealer = await settleDealer(dealerInitial, round);
      if (!isRoundActive(round)) return;

      if (!dealer.autoResult) {
        await pause(DICE_PLAYER_AUTO_MS);
        if (!isRoundActive(round)) return;
      }

      const finalResult = await settlePlayer(round);
      if (!isRoundActive(round)) return;

      finishRound(finalResult);
    } catch {
      if (!isRoundActive(round)) return;
      failRound("Ошибка сервера. Попробуй ещё раз.");
    }
  };

  const showDealerLabel = gamePhase !== "idle";

  return (
    <main className="flex h-full w-full flex-col items-center gap-2 p-2">
      <section className="flex flex-col w-xl items-center gap-1 border-2 border-highlight-high bg-background px-2">
        <span className="text-lg font-bold">{displayBalance} чубриков</span>
      </section>

      <section className="flex w-xl items-center justify-center gap-1.5 border-2 border-highlight-high bg-background px-3 py-1.5">
        <span className="text-sm text-muted mr-1">Ставка</span>
        {bidOptions.map((v) => (
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
          playerDiceActive={playerDiceActive}
        />

        {result && (
          <span
            className={cn(
              "absolute bottom-0 left-1/2 -translate-x-1/2 text-center text-lg font-bold w-full pb-1",
              getResultColor(result),
            )}
          >
            {result.label}
            {result.net > 0 && <span> +{result.net}</span>}
            {result.net < 0 && <span> {result.net}</span>}
          </span>
        )}
      </section>

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
            <p className="text-muted text-xs">
              Если нет комбинации (3 разных числа, не 1·2·3 и не 4·5·6) -
              переброс до 2 раз (всего 3 броска), затем играют последние кости.
            </p>
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
                  <span className="text-emerald-400">+{bid * 2}</span>
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
                  <span>Ничего (3 уникальных)</span>
                  <span className="text-muted">Ничья</span>
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
