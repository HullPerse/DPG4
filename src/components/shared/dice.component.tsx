import { useCallback, useState, useEffect } from "react";
import { Button } from "../ui/button.component";
import { DiceItem } from "@/types/dice";
import { Plus, Trash } from "lucide-react";
import RunSvg from "../svg/run.component";

export default function DiceComponent() {
  const [diceGroups, setDiceGroups] = useState<number[]>([1]);
  const [diceItems, setDiceItems] = useState<DiceItem[]>([]);
  const [isRolling, setIsRolling] = useState(false);
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    if (diceItems.length === 0) {
      const placeholders: DiceItem[] = [];
      diceGroups.forEach((group, groupIdx) => {
        for (let i = 0; i < group; i++) {
          placeholders.push({
            id: `placeholder-${groupIdx}-${i}`,
            value: 0,
            isRolling: false,
            isPlaceholder: true,
          });
        }
      });
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

    setDiceItems((prev) => {
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
                  value: Math.floor(Math.floor(Math.random() * 6) + 1),
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

      return updated;
    });
  }, []);

  const addDiceGroup = useCallback(() => {
    setDiceGroups([...diceGroups, 1]);

    // Add placeholder dice immediately
    setDiceItems((prev) => [
      ...prev,
      { id: Date.now(), value: 0, isRolling: false, isPlaceholder: true },
    ]);
  }, []);

  return (
    <main className="relative flex flex-col w-full gap-2 p-2 min-h-fit h-30">
      {diceItems.length > 0 && (
        <div className="flex flex-wrap justify-start gap-2">
          {diceItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className="flex flex-col items-center space-y-1 cursor-pointer group"
              onClick={() => handleReroll(item.id)}
              disabled={item.isRolling}
            >
              {getDiceDisplay(item)}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-row w-full gap-1 items-center justify-center mt-auto">
        <Button
          title="Убрать все кубики"
          size="icon"
          variant="error"
          onClick={() => {
            setDiceGroups([1]);
            setDiceItems([]);
          }}
        >
          <Trash />
        </Button>
        <Button
          title="Добавить кубик"
          variant="default"
          size="icon"
          onClick={() => addDiceGroup()}
          disabled={diceGroups.length >= 5}
        >
          <Plus />
        </Button>
        <Button
          title="Ходить по карте"
          variant="success"
          size="icon"
          disabled={!total}
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
          {diceItems.length > 1 && (
            <>
              <span className="mx-2 text-primary">=</span>
              <span className="text-primary font-bold font-mono">
                {total ?? 0}
              </span>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
