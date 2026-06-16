import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { useDevModeStore } from "../../hooks/dev.store";
import { Button } from "@/components/ui/button.component";
import { Code, X } from "lucide-react";

function Section({
  title,
  enabled,
  onToggle,
  children,
}: {
  title: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <details open={enabled} className="border-t border-white/10 pt-0.5">
      <summary className="flex items-center gap-1 cursor-pointer text-xs font-semibold text-muted select-none py-0.5">
        <input
          id={title}
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            e.stopPropagation();
            onToggle(e.target.checked);
          }}
          className="accent-emerald-500 size-3 cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        />
        <label role="button" className="flex-1" htmlFor={title}>
          {title}
        </label>
        <span className="text-[10px] opacity-50">
          {enabled ? "free" : "off"}
        </span>
      </summary>
      {enabled && (
        <div className="flex flex-col gap-1 pl-2 pb-1">{children}</div>
      )}
    </details>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-emerald-500"
      />
      {label}
    </label>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs">
      <span className="text-muted min-w-20">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="w-16 bg-foreground/10 text-foreground px-1 py-0.5 text-xs border border-white/10"
      />
    </label>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs">
      <span className="text-muted min-w-16">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-foreground/10 text-foreground px-1 py-0.5 text-xs border border-white/10"
      />
    </label>
  );
}

export function DevPanel() {
  const [collapsed, setCollapsed] = useState(true);

  const devMode = useDevModeStore((s) => s.devMode);
  const setDevMode = useDevModeStore((s) => s.setDevMode);

  const dice = useDevModeStore((s) => s.dice);
  const setDice = useDevModeStore((s) => s.setDice);
  const blackjack = useDevModeStore((s) => s.blackjack);
  const setBlackjack = useDevModeStore((s) => s.setBlackjack);
  const rocket = useDevModeStore((s) => s.rocket);
  const setRocket = useDevModeStore((s) => s.setRocket);
  const pachinko = useDevModeStore((s) => s.pachinko);
  const setPachinko = useDevModeStore((s) => s.setPachinko);
  const mines = useDevModeStore((s) => s.mines);
  const setMines = useDevModeStore((s) => s.setMines);
  const jackpot = useDevModeStore((s) => s.jackpot);
  const setJackpot = useDevModeStore((s) => s.setJackpot);

  const reset = useDevModeStore((s) => s.reset);

  const handleReset = useCallback(() => {
    reset();
  }, [reset]);

  if (collapsed) {
    return (
      <Button
        onClick={() => setCollapsed(false)}
        variant={devMode ? "success" : "error"}
        className={cn(
          "fixed left-2 bottom-10 z-50 size-8 flex items-center justify-center-full text-xs font-bold border transition-colors",
        )}
        title="Dev Mode"
      >
        <Code />
      </Button>
    );
  }

  return (
    <div className="fixed left-2 bottom-10 z-50 w-80 max-h-[80vh] overflow-y-auto bg-background/95 border border-white/20 shadow-xl flex flex-col">
      <div className="flex items-center justify-between p-1.5 border-b border-white/10 sticky top-0 bg-background/95">
        <span className="text-xs font-bold">Dev Mode</span>
        <div className="flex gap-1 items-center">
          <Button
            onClick={handleReset}
            className="h-6 w-12 text-xs"
            title="Reset all"
          >
            Reset
          </Button>
          <Button
            size="icon"
            onClick={() => setCollapsed(true)}
            className="text-xs h-6 w-6"
          >
            <X />
          </Button>
        </div>
      </div>

      <div className="p-1.5 flex flex-col gap-1 w-full">
        <Toggle
          label="Master dev mode toggle"
          checked={devMode}
          onChange={setDevMode}
        />

        {devMode && (
          <>
            <Section
              title="Dice"
              enabled={dice.enabled}
              onToggle={(v) => setDice({ enabled: v })}
            >
              <Toggle
                label="Force break"
                checked={dice.devForceBreak}
                onChange={(v) => setDice({ devForceBreak: v })}
              />
              <NumberInput
                label="Broken die"
                value={dice.devForceBreakDieIndex}
                onChange={(v) => setDice({ devForceBreakDieIndex: v })}
                min={0}
                max={2}
                step={1}
              />
              <TextInput
                label="Dealer values"
                value={
                  dice.devForceDealerValues
                    ? dice.devForceDealerValues.join("")
                    : ""
                }
                onChange={(v) =>
                  setDice({
                    devForceDealerValues: v
                      ? (v
                          .replace(/[^1-6]/g, "")
                          .split("")
                          .slice(0, 3)
                          .map(Number) as [number, number, number])
                      : null,
                  })
                }
                placeholder="446"
              />
              <TextInput
                label="Player values"
                value={
                  dice.devForcePlayerValues
                    ? dice.devForcePlayerValues.join("")
                    : ""
                }
                onChange={(v) =>
                  setDice({
                    devForcePlayerValues: v
                      ? (v
                          .replace(/[^1-6]/g, "")
                          .split("")
                          .slice(0, 3)
                          .map(Number) as [number, number, number])
                      : null,
                  })
                }
                placeholder="446"
              />
            </Section>

            <Section
              title="Blackjack"
              enabled={blackjack.enabled}
              onToggle={(v) => setBlackjack({ enabled: v })}
            >
              <TextInput
                label="Force dealer"
                value={blackjack.devForceDealerCards ?? ""}
                onChange={(v) =>
                  setBlackjack({ devForceDealerCards: v || null })
                }
                placeholder='[{"suit":"hearts","rank":"A"}]'
              />
              <TextInput
                label="Force player"
                value={blackjack.devForcePlayerCards ?? ""}
                onChange={(v) =>
                  setBlackjack({ devForcePlayerCards: v || null })
                }
                placeholder='[{"suit":"spades","rank":"10"}]'
              />
              <TextInput
                label="Force hit card"
                value={blackjack.devForceHitCard ?? ""}
                onChange={(v) => setBlackjack({ devForceHitCard: v || null })}
                placeholder='{"suit":"hearts","rank":"K"}'
              />
              <Toggle
                label="Peek hole card"
                checked={blackjack.devPeekHole}
                onChange={(v) => setBlackjack({ devPeekHole: v })}
              />
            </Section>

            <Section
              title="Rocket"
              enabled={rocket.enabled}
              onToggle={(v) => setRocket({ enabled: v })}
            >
              <NumberInput
                label="Crash point"
                value={rocket.devForceCrashPoint ?? 1}
                onChange={(v) => setRocket({ devForceCrashPoint: v })}
                min={1}
                max={100}
                step={0.1}
              />
              <Toggle
                label="Show crash point"
                checked={rocket.devShowCrashPoint}
                onChange={(v) => setRocket({ devShowCrashPoint: v })}
              />
            </Section>

            <Section
              title="Pachinko"
              enabled={pachinko.enabled}
              onToggle={(v) => setPachinko({ enabled: v })}
            >
              <TextInput
                label="Force slots"
                value={
                  pachinko.devForceSlots
                    ? pachinko.devForceSlots.replace(/[^0-9,]/g, "")
                    : ""
                }
                onChange={(v) =>
                  setPachinko({
                    devForceSlots: v.replace(/[^0-9,]/g, "") || null,
                  })
                }
                placeholder="0,1,2"
              />
              <Toggle
                label="Show multipliers"
                checked={pachinko.devShowMultipliers}
                onChange={(v) => setPachinko({ devShowMultipliers: v })}
              />
            </Section>

            <Section
              title="Mines"
              enabled={mines.enabled}
              onToggle={(v) => setMines({ enabled: v })}
            >
              <Toggle
                label="Show mines"
                checked={mines.devShowMines}
                onChange={(v) => setMines({ devShowMines: v })}
              />
              <Toggle
                label="Force all safe"
                checked={mines.devForceAllSafe}
                onChange={(v) => setMines({ devForceAllSafe: v })}
              />
            </Section>

            <Section
              title="Jackpot"
              enabled={jackpot.enabled}
              onToggle={(v) => setJackpot({ enabled: v })}
            >
              <Toggle
                label="Force win"
                checked={jackpot.devForceWin}
                onChange={(v) => setJackpot({ devForceWin: v })}
              />
              <Toggle
                label="Show winning number"
                checked={jackpot.devShowWinningNumber}
                onChange={(v) => setJackpot({ devShowWinningNumber: v })}
              />
            </Section>
          </>
        )}
      </div>
    </div>
  );
}
