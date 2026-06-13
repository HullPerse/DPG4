import { useUserStore } from "@/store/user.store";
import { Button } from "@/components/ui/button.component";
import { useRef, useCallback, useState, memo, useEffect } from "react";
import { flushSync } from "react-dom";
import { useMutation } from "@tanstack/react-query";
import {
  rollDiceDealer,
  rerollDiceDealer,
  rollDicePlayer,
  abortDice,
} from "@/api/gambling.api";
import DiceScene from "../components/scenes/scene.dice";
import {
  DICE_SETTLE_HOLD_MS,
  DICE_REROLL_PAUSE_MS,
  DICE_PLAYER_AUTO_MS,
} from "@/lib/gambling/dice.utils";
import {
  DiceRollCoordinator,
  DiceRow,
} from "@/lib/gambling/diceRollCoordinator";
import { DiceDealerResult, DiceGameResult, DiceResult } from "@/types/gamble";
import { useBidOptions, useGamblingStore } from "@/hooks/use-gambling";
import { BalanceDisplay } from "../components/balance.component";
import { BidSelector } from "../components/bid.component";
import { GameResult } from "../components/result.component";
import ImageComponent from "@/components/shared/image.component";

function pause(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function DiceTab() {
  const { user, balance, ticketBalance, gamblingBanned, setGamblingBanned } =
    useGamblingStore();
  const bidOptions = useBidOptions();

  const [bid, setBid] = useState(3);

  const [, setGamePhase] = useState<"idle" | "dealer" | "player" | "result">(
    "idle",
  );

  const [dealerValues, setDealerValues] = useState<
    [number, number, number] | null
  >(null);
  const [playerValues, setPlayerValues] = useState<
    [number, number, number] | null
  >(null);
  const [result, setResult] = useState<DiceResult>(null);

  const [dealerThrowKey, setDealerThrowKey] = useState(0);
  const [playerThrowKey, setPlayerThrowKey] = useState(0);
  const [playerDiceActive, setPlayerDiceActive] = useState(false);
  const [displayBalance, setDisplayBalance] = useState(user?.tickets ?? 0);

  const rollCoordinatorRef = useRef(new DiceRollCoordinator());
  const dealerKeyRef = useRef(0);
  const playerKeyRef = useRef(0);
  const roundIdRef = useRef(0);

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
      user: { ...user!, tickets: finalResult.balance },
    });
    if (finalResult.banned) setGamblingBanned(true);
    setResult({
      net: finalResult.net,
      label: finalResult.label,
      tone: finalResult.tone,
    });
    setGamePhase("result");
  };

  const failRound = (label: string, balance?: number) => {
    const tickets = balance ?? useUserStore.getState().user?.tickets ?? 0;
    useUserStore.setState({
      user: { ...useUserStore.getState().user!, tickets },
    });
    setDisplayBalance(tickets);
    setResult({ net: 0, label, tone: "chance" });
    setGamePhase("result");
  };

  const resetDiceVisuals = () => {
    rollCoordinatorRef.current.cancel();
    setDealerValues(null);
    setPlayerValues(null);
    setPlayerDiceActive(false);
  };

  const gameMutation = useMutation({
    mutationFn: async () => {
      if (!user || ticketBalance < bid || gamblingBanned) return;

      const round = ++roundIdRef.current;
      resetDiceVisuals();
      setResult(null);
      setDisplayBalance(ticketBalance);
      setGamePhase("dealer");

      await abortDice();
      if (!isRoundActive(round)) return;

      const dealerInitial = await rollDiceDealer(bid);
      if (!isRoundActive(round)) return;

      await settleDealer(dealerInitial, round);
      if (!isRoundActive(round)) return;

      await pause(DICE_PLAYER_AUTO_MS);
      if (!isRoundActive(round)) return;

      const finalResult = await settlePlayer(round);
      if (!isRoundActive(round)) return;

      finishRound(finalResult);
    },
    onError: async () => {
      try {
        const { balance } = await abortDice();
        failRound("Ошибка сервера. Ставка возвращена.", balance);
      } catch {
        failRound("Ошибка сервера. Попробуй ещё раз.");
      }
    },
  });

  return (
    <main className="flex h-full w-full flex-col items-center gap-2 p-2">
      <BalanceDisplay balance={balance} ticketBalance={displayBalance} />

      <BidSelector
        bidOptions={bidOptions}
        bid={bid}
        onBidChange={setBid}
        disabled={gameMutation.isPending}
      />

      <section className="relative w-full h-110 min-h-110 overflow-hidden border-2 border-highlight-high bg-background">
        <DiceScene
          dealerThrowKey={dealerThrowKey}
          playerThrowKey={playerThrowKey}
          dealerValues={dealerValues}
          playerValues={playerValues}
          onDealerSettled={handleDealerSettled}
          onPlayerSettled={handlePlayerSettled}
          playerDiceActive={playerDiceActive}
        />

        <GameResult result={result} />
      </section>

      <section className="flex flex-col mt-auto gap-1">
        <Button
          variant="info"
          className="w-xl"
          loading={gameMutation.isPending}
          disabled={ticketBalance < bid || gamblingBanned}
          onClick={() => gameMutation.mutate()}
        >
          {gamblingBanned
            ? "Вы забанены"
            : ticketBalance < bid
              ? "Недостаточно тикетов"
              : `Кинуть (${bid})`}
        </Button>

        <details className="w-xl border-2 border-highlight-high bg-background px-2 text-sm">
          <summary className="cursor-pointer font-semibold text-muted select-none">
            Правила
          </summary>
          <div className="mt-2 flex flex-col gap-2 pl-1">
            <p className="text-muted text-xs">
              Игрок и дилер кидают по три кубика. Чья комбинация сильнее - тот
              побеждает и забирает ставку с множителем. Если нет комбинации (3
              разных числа, не 1·2·3 и не 4·5·6) - до 2 перебросов
            </p>
            <div>
              <span className="font-semibold text-primary">
                Комбинации (сильнее → слабее):
              </span>
              <ul className="flex flex-col gap-0.5 pl-2">
                <li className="flex justify-between">
                  <span>1·1·1</span>
                  <span className="text-amber-400">×5</span>
                </li>
                <li className="flex justify-between">
                  <span>Три одинаковых (кроме 1·1·1)</span>
                  <span className="text-emerald-400">×3</span>
                </li>
                <li className="flex justify-between">
                  <span>4·5·6</span>
                  <span className="text-emerald-400">×2</span>
                </li>
                <li className="flex justify-between">
                  <span>Пара + число</span>
                  <span className="text-muted">×1 (сравнить число)</span>
                </li>
                <li className="flex justify-between">
                  <span>1·2·3</span>
                  <span className="text-red-400">×2 сопернику</span>
                </li>
              </ul>
            </div>
            <p className="text-muted text-xs">
              При одинаковых комбинациях сравнивается число (у пары и тройки).
              Если всё равно - ничья.
            </p>
          </div>

          <div className="p-2 flex flex-col w-full items-center justify-center">
            <ImageComponent
              src="diceRules.png"
              alt="dice rules"
              className="w-120 h-120 border-2 border-highlight-high"
            />
          </div>
        </details>
      </section>
    </main>
  );
}

export default memo(DiceTab);
