import { memo, useMemo, useState } from "react";

import { EyeIcon, EyeOffIcon, Plus, Trash } from "lucide-react";
import Wheel from "@/components/shared/wheel.component";
import { Button } from "@/components/ui/button.component";
import { useDataStore } from "@/store/data.store";
import { Input } from "@/components/ui/input.component";

function CustomWheel() {
  const savedWheel = useDataStore((state) => state.savedWheel);
  const setSavedWheel = useDataStore((state) => state.setSavedWheel);

  const [hiddenItems, setHiddenItems] = useState<string[]>([]);
  const [custom, setCustom] = useState<string>("");

  const visibleItems = useMemo(() => {
    return (
      savedWheel?.filter((item) => !hiddenItems.includes(String(item))) ?? []
    );
  }, [savedWheel]);

  return (
    <main className="flex flex-col gap-2 w-full h-full">
      {/* WHEEL */}
      <section className="flex flex-col w-full gap-2 p-2 items-center justify-center">
        <Wheel
          key={`wheel-${savedWheel?.join("|")}-${hiddenItems.join(",")}`}
          list={visibleItems.map((item, index) => ({
            id: String(index),
            label: item,
            image: "✏️",
            type: "emoji",
          }))}
          onResult={() => {}}
          free
        />
      </section>

      {/* LIST */}
      <section className="flex h-full w-full flex-col gap-2 overflow-y-auto p-2 items-center border-t-2 border-highlight-high">
        <div className="flex flex-row w-xl max-w-full gap-2">
          <Input
            className="flex-1 h-9"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
          />
          <Button
            size="icon"
            variant="success"
            onClick={() => {
              setSavedWheel([...savedWheel, custom]);
              setCustom("");
            }}
            disabled={!custom}
          >
            <Plus />
          </Button>
        </div>
        {savedWheel?.map((item, index) => (
          <section
            key={index}
            className="relative p-2 flex flex-row w-full max-w-full min-h-16 h-16 border-2 border-highlight-high items-center"
            style={{
              opacity: hiddenItems.find((h) => h === String(item)) && "50%",
            }}
          >
            <span className="w-80 truncate font-bold text-xl">{item}</span>

            <div className="ml-auto flex flex-row gap-1">
              <Button
                size="icon"
                onClick={() => {
                  const existingGame =
                    hiddenItems.filter((h) => h === String(item)).length > 0;

                  if (!existingGame)
                    return setHiddenItems([...hiddenItems, String(item)]);

                  return setHiddenItems(
                    hiddenItems.filter((h) => h !== String(item)),
                  );
                }}
              >
                {hiddenItems.find((h) => h === String(item)) ? (
                  <EyeIcon size={20} />
                ) : (
                  <EyeOffIcon size={20} />
                )}
              </Button>
              <Button
                size="icon"
                variant="error"
                onClick={() => {
                  const existing = savedWheel.filter((i) => i !== item);

                  setSavedWheel(existing);
                }}
              >
                <Trash />
              </Button>
            </div>
          </section>
        ))}
      </section>
    </main>
  );
}

export default memo(CustomWheel);
