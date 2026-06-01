import { useUserStore } from "@/store/user.store";
import { useDataStore } from "@/store/data.store";
import { Button } from "@/components/ui/button.component";
import { useRef, useCallback, useState, memo } from "react";
import { cn } from "@/lib/utils";
import { rollDice } from "@/api/gambling.api";
import DiceScene from "../components/scene.dice";
import { SmallLoader } from "@/components/shared/loader.component";
import { getResultColor } from "@/lib/gambling/dice.utils";
import { DicePending, DiceResult, DiceRevealed } from "@/types/gamble";

const BASE_PRICE = 3;

const RULES = [
  { text: "1 · 2 · 3", result: "−6" },
  { text: "4 · 5 · 6", result: "+3" },
  { text: "1 · 1 · 1", result: "+15 (джекпот)" },
  { text: "Три одинаковых (кроме 1)", result: "+6" },
  { text: "Пара", result: "50%: +4 / −2" },
  { text: "Остальное", result: "50%: +5 / −1" },
];

function DiceTab() {
  const user = useUserStore((state) => state.user);
  const gamblingBanned = useDataStore((state) => state.gamblingBanned);
  const setGamblingBanned = useDataStore((state) => state.setGamblingBanned);

  const [rolling, setRolling] = useState<boolean>(false);
  const [rollKey, setRollKey] = useState<number>(0);
  const [result, setResult] = useState<DiceResult>(null);
  const [pendingValues, setPendingValues] = useState<DicePending>(null);
  const [revealedValues, setRevealedValues] = useState<DiceRevealed>([
    null,
    null,
    null,
  ]);

  const pendingRef = useRef<DicePending>(null);
  const revealTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const settleWaitRef = useRef<{
    resolve: () => void;
    settled: Set<number>;
  } | null>(null);

  const balance = user?.money ?? 0;

  const waitForAllDice = useCallback(
    () =>
      new Promise<void>((resolve) => {
        settleWaitRef.current = { resolve, settled: new Set() };
      }),
    [],
  );

  const displayLine = () => {
    const values = revealedValues.some((v) => v);

    if (values) return `[${revealedValues.map((v) => v ?? "·").join(" · ")}]`;
    else if (rolling) return "[ · · · ]";
    else return null;
  };

  const handleDiceSettled = (index: number) => {
    const values = pendingRef.current;

    if (!values) return;

    const timeoutId = setTimeout(() => {
      setRevealedValues((prev) => {
        const next: [number | null, number | null, number | null] = [...prev];
        next[index] = values[index];
        return next;
      });
    }, index * 300);

    revealTimeoutsRef.current.push(timeoutId);

    const waiter = settleWaitRef.current;
    if (!waiter) return;

    waiter.settled.add(index);
    if (waiter.settled.size === 3) {
      waiter.resolve();
      settleWaitRef.current = null;
    }
  };

  const handleRoll = async () => {
    if (rolling || !user || balance < BASE_PRICE || gamblingBanned) return;

    revealTimeoutsRef.current.forEach(clearTimeout);
    revealTimeoutsRef.current = [];
    setResult(null);
    setRevealedValues([null, null, null]);
    setRolling(true);

    try {
      const result = await rollDice(String(user.id));

      pendingRef.current = result.values;
      setPendingValues(result.values);
      setRollKey((k) => k + 1);

      await waitForAllDice();

      useUserStore.setState({
        user: { ...user, money: result.balance },
      });

      const netLabel =
        result.net >= 0
          ? `${result.label} · итого +${result.net}`
          : `${result.label} · итого ${result.net}`;

      if (result.banned) {
        setGamblingBanned(true);
      }

      setResult({ net: result.net, label: netLabel, tone: result.tone });
      setRolling(false);
    } catch {
      setRolling(false);
      setPendingValues(null);
    }
  };

  return (
    <main className="flex h-full w-full flex-col items-center gap-2 p-2">
      {/*INFO*/}
      <section className="flex flex-col w-xl items-center gap-1 border-2 border-highlight-high bg-background px-2">
        <span className="text-lg font-bold">{balance} чубриков</span>
        <span className="text-sm text-muted">
          Стоимость броска: {BASE_PRICE}
        </span>
        {displayLine() && (
          <span className="text-sm text-primary tracking-widest">
            {displayLine()}
          </span>
        )}
      </section>
      {/*DICE*/}
      <section className="relative w-full h-64 overflow-hidden border-2 border-highlight-high bg-background">
        <DiceScene
          throwKey={rollKey}
          finalValues={pendingValues}
          onDieSettled={handleDiceSettled}
        />

        {result && (
          <span
            className={cn(
              "absolute bottom-0 left-1/2 -translate-x-1/2 text-center text-lg font-bold w-full",
              getResultColor(result),
            )}
          >
            {result.label}
          </span>
        )}
      </section>
      {/*BUTTON AND RULES*/}
      <section className="flex flex-col mt-auto gap-1">
        <Button
          variant="info"
          className="w-xl"
          onClick={handleRoll}
          disabled={rolling || balance < BASE_PRICE || gamblingBanned}
        >
          {gamblingBanned ? "Вы забанены" : rolling ? <SmallLoader /> : `Кинуть (${BASE_PRICE})`}
        </Button>

        <details
          className="w-xl border-2 border-highlight-high bg-background px-2 text-sm"
          open
        >
          <summary className="cursor-pointer font-semibold text-muted select-none">
            Правила
          </summary>
          <ul className="mt-2 flex flex-col gap-1 pl-1">
            {RULES.map((rule) => (
              <li key={rule.text} className="flex justify-between gap-2">
                <span>{rule.text}</span>
                <span className="text-right font-medium">{rule.result}</span>
              </li>
            ))}
          </ul>
        </details>
      </section>
    </main>
  );
}

export default memo(DiceTab);
