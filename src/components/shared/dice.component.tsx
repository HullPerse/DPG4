import { useCallback, useState, useEffect } from "react";
import { Button } from "../ui/button.component";
import { DiceItem, DiceType } from "@/types/dice";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select.component";
import { Plus, Trash } from "lucide-react";
import RunSvg from "../svg/run.component";

const DICE_MAX: Record<DiceType, number> = {
  d4: 4,
  d6: 6,
  d8: 8,
  d10: 10,
  d12: 12,
  d20: 20,
};

const DICE_TYPES: DiceType[] = ["d4", "d6", "d8", "d10", "d12", "d20"];

interface DiceComponentProps {
  minDice?: number;
  action?: "MOVE_POSITIVE" | "MOVE_NEGATIVE" | "GAMEADD" | "GAMEFINISH";
  handleMove: (dice: number) => void;
  additional: string;
}

export default function DiceComponent({
  minDice = 1,
  action,
  handleMove,
  additional,
}: DiceComponentProps) {
  const [diceGroups, setDiceGroups] = useState<DiceType[]>(() => {
    const count = Math.max(minDice, 1);
    return Array(count).fill("d6");
  });
  const [addDiceType, setAddDiceType] = useState<DiceType>("d6");
  const [diceItems, setDiceItems] = useState<DiceItem[]>([]);
  const [isRolling, setIsRolling] = useState(false);
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    if (diceItems.length === 0) {
      const placeholders: DiceItem[] = diceGroups.map((type, idx) => ({
        id: `placeholder-${idx}`,
        value: 0,
        type,
        isRolling: false,
        isPlaceholder: true,
      }));
      setDiceItems(placeholders);
    }
  }, [diceGroups]);

  const getDiceDisplay = (item: DiceItem) => {
    if (item.isRolling) {
      return (
        <div className="flex h-16 w-16 transform animate-spin items-center justify-center border border-primary bg-background font-bold rounded text-primary shadow-sharp-sm transition-transform hover:scale-105">
          ?
        </div>
      );
    }

    if (item.isPlaceholder) {
      return (
        <div className="flex h-16 w-16 transform items-center justify-center rounded border border-dashed border-primary/50 bg-background/50 font-bold text-primary/50 shadow-sharp-sm">
          ?
        </div>
      );
    }

    return (
      <div className="flex h-16 w-16 transform items-center justify-center rounded border border-primary bg-background font-bold text-primary shadow-sharp-sm transition-transform hover:scale-105">
        {item.value}
      </div>
    );
  };

  const handleReroll = useCallback((id: string | number) => {
    if (isRolling) return;
    setIsRolling(true);

    setDiceItems((prev) => {
      const item = prev.find((i) => i.id === id);
      const max = item ? DICE_MAX[item.type] : 6;

      const updated = prev.map((item) =>
        item.id === id
          ? { ...item, value: 0, isRolling: true, isPlaceholder: false }
          : item,
      );

      setTimeout(() => {
        setDiceItems((current) => {
          const final = current.map((item) =>
            item.id === id
              ? {
                  ...item,
                  value: Math.floor(Math.random() * max) + 1,
                  isRolling: false,
                  isPlaceholder: false,
                }
              : item,
          );

          const newTotal = final.reduce((sum, item) => sum + item.value, 0);
          setTotal(newTotal);
          return final;
        });
      }, 800);

      setIsRolling(false);

      return updated;
    });
  }, []);

  const addDiceGroup = useCallback(() => {
    setDiceGroups([...diceGroups, addDiceType]);

    setDiceItems((prev) => [
      ...prev,
      {
        id: Date.now(),
        value: 0,
        type: addDiceType,
        isRolling: false,
        isPlaceholder: true,
      },
    ]);
  }, [diceGroups, addDiceType]);

  const handleTypeChange = useCallback(
    (id: string | number, newType: DiceType) => {
      setDiceItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, type: newType } : item,
        ),
      );
      const idx = diceItems.findIndex((item) => item.id === id);
      if (idx !== -1) {
        setDiceGroups((prev) => {
          const updated = [...prev];
          updated[idx] = newType;
          return updated;
        });
      }
    },
    [diceItems],
  );

  const removeDice = useCallback(
    (id: string | number) => {
      const idx = diceItems.findIndex((item) => item.id === id);
      const initCount = Math.max(minDice, 1);
      if (idx < initCount || idx === -1) return;

      setDiceItems((prev) => prev.filter((item) => item.id !== id));
      setDiceGroups((prev) => prev.filter((_, i) => i !== idx));
      setTotal((prev) =>
        prev === null ? null : prev - (diceItems[idx]?.value ?? 0),
      );
    },
    [diceItems, minDice],
  );

  const resetDice = useCallback(
    (id: string | number) => {
      setDiceItems((prev) => {
        const idx = prev.findIndex((item) => item.id === id);
        if (idx === -1) return prev;
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          value: 0,
          isPlaceholder: true,
          isRolling: false,
        };
        return updated;
      });
      setTotal((prev) => {
        if (prev === null) return null;
        const item = diceItems.find((i) => i.id === id);
        return item ? prev - item.value : prev;
      });
    },
    [diceItems],
  );

  return (
    <main className="relative flex flex-col w-full gap-2 p-2 min-h-fit h-30">
      {diceItems.length > 0 && (
        <div className="flex flex-wrap justify-start gap-2">
          {diceItems.map((item, index) => (
            <div
              key={item.id}
              className="flex flex-col items-center gap-1"
              onContextMenu={(e) => {
                e.preventDefault();
                if (index >= Math.max(minDice, 1)) {
                  removeDice(item.id);
                } else if (!item.isPlaceholder && !item.isRolling) {
                  resetDice(item.id);
                }
              }}
            >
              <Select
                value={item.type}
                onValueChange={(val) =>
                  handleTypeChange(item.id, val as DiceType)
                }
                disabled={item.isRolling}
              >
                <SelectTrigger className="text-sm max-h-6 h-6 min-w-17 w-17 mb-1 p-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DICE_TYPES.map((dt) => (
                    <SelectItem key={dt} value={dt} className="text-xs">
                      {dt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                type="button"
                className="flex flex-col items-center space-y-1 cursor-pointer group"
                onClick={() => handleReroll(item.id)}
                disabled={item.isRolling}
              >
                {getDiceDisplay(item)}
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-row w-full gap-1 items-center justify-center mt-auto">
        <Button
          title="Убрать все кубики"
          size="icon"
          variant="error"
          onClick={() => {
            setDiceGroups(Array(Math.max(minDice, 1)).fill("d6"));
            setDiceItems([]);
          }}
          disabled={isRolling}
        >
          <Trash />
        </Button>
        <Select
          value={addDiceType}
          onValueChange={(val) => setAddDiceType(val as DiceType)}
        >
          <SelectTrigger className="text-xs ">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DICE_TYPES.map((dt) => (
              <SelectItem key={dt} value={dt} className="text-sm">
                {dt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          title="Добавить кубик"
          variant="default"
          size="icon"
          onClick={() => addDiceGroup()}
          disabled={diceItems.length >= 5 || isRolling}
        >
          <Plus />
        </Button>
        <Button
          title="Ходить по карте"
          variant="success"
          size="icon"
          onClick={() => {
            const finalValue =
              action === "MOVE_NEGATIVE" ? -Math.abs(total ?? 0) : (total ?? 0);
            handleMove(finalValue + Number(additional));
          }}
          disabled={(!total && !additional) || isRolling}
        >
          <RunSvg className="size-6" />
        </Button>
      </div>
      <div className="flex flex-row gap-2 items-center p-4 text-center border-t border-primary/20">
        <h3 className="font-semibold text-primary">Результат:</h3>
        <div className="text-lg">
          <span className="text-primary font-mono">
            {diceItems.map((item) => item.value).join(" + ")}
          </span>
          <span className="font-mono text-text px-1 text-[16px]">
            {Number(additional) >= 0
              ? `(+${additional ? additional : 0})`
              : `(${additional ? additional : 0})`}
          </span>
          {diceItems.length > 0 && (
            <>
              <span className="mx-2 text-primary">=</span>
              <span className="text-primary font-bold font-mono">
                {total !== null
                  ? action === "MOVE_NEGATIVE"
                    ? -Math.abs(total) + Number(additional)
                    : total
                  : 0}
              </span>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
