import { useState, useEffect } from "react";
import {
  browserGames,
  logicalGames,
  flashGames,
} from "@/config/links.config.tsx";
import { openWindow } from "@/lib/utils";
import { EyeIcon, EyeOffIcon, ExternalLink } from "lucide-react";
import Wheel from "@/components/shared/wheel.component";
import { Button } from "@/components/ui/button.component";
import { openUrl } from "@tauri-apps/plugin-opener";

const arrays = [
  { name: "Браузерные игры", data: browserGames },
  { name: "Логические задания", data: logicalGames },
  { name: "Флэш игры", data: flashGames },
] as const;

function LogicalWheel({
  selected,
  values,
  setValues,
}: {
  selected: number;
  values: string[];
  setValues: (values: string[]) => void;
}) {
  const [hiddenItems, setHiddenItems] = useState<string[]>([]);
  const [result, setResult] = useState<{
    description: string;
    link: string;
  } | null>(null);

  const currentArray = arrays[selected]?.data ?? browserGames;
  const visibleItems = currentArray.filter(
    (item) => !hiddenItems.includes(item.link),
  );

  useEffect(() => {
    if (values.length === 0) {
      setValues(arrays.map((a) => a.name));
    }
  }, [values.length, setValues]);

  return (
    <main className="flex flex-col gap-2 w-full h-full">
      {/* WHEEL */}
      <section className="flex flex-col w-full gap-2 p-2 items-center justify-center">
        <Wheel
          key={`wheel-${selected}-${hiddenItems.join(",")}`}
          list={visibleItems.map((item, idx) => ({
            id: item.link,
            label: `Предмет ${idx + 1}`,
            image: "",
            type: "image" as const,
          }))}
          onResult={(it) => {
            const found = currentArray.find((item) => item.link === it?.id);
            return setResult(found ?? null);
          }}
          free
        />

        {result && (
          <section
            key={result.link}
            className="relative p-2 flex flex-row max-w-full w-xl min-h-fit h-22 border-2 border-highlight-high items-center"
          >
            <div className="flex flex-col ml-2">
              <span className="font-bold text-xl">
                {`Предмет ${visibleItems.indexOf(result) + 1}`}
              </span>
              <span className="text-text/80">{result.description}</span>
            </div>
            <div className="ml-auto flex flex-row gap-1">
              <Button
                variant="info"
                size="icon"
                title="Открыть ссылку"
                onClick={() => {
                  openWindow(`Выполнение`, result.link, result.description);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  openUrl(result.link);
                }}
              >
                <ExternalLink size={18} />
              </Button>
            </div>
          </section>
        )}
      </section>

      {/* LIST */}
      <section className="flex h-full w-full flex-col gap-2 overflow-y-auto p-2 items-center border-t-2 border-highlight-high">
        {visibleItems.map((item, index) => (
          <section
            key={item.link + index}
            className="relative p-2 flex flex-row w-full min-h-fit h-22 border-2 border-highlight-high items-center"
            style={{
              opacity: hiddenItems.includes(item.link) ? "50%" : "100%",
            }}
          >
            <div className="flex flex-col ml-2">
              <span className="font-bold text-xl">
                {`Предмет ${visibleItems.indexOf(item) + 1}`}
              </span>
              <span className="text-text/80">{item.description}</span>
            </div>
            <div className="ml-auto flex flex-row gap-1">
              <Button
                size="icon"
                onClick={() => {
                  const existing = hiddenItems.includes(item.link);
                  if (!existing)
                    return setHiddenItems([...hiddenItems, item.link]);
                  return setHiddenItems(
                    hiddenItems.filter((h) => h !== item.link),
                  );
                }}
              >
                {hiddenItems.includes(item.link) ? (
                  <EyeOffIcon size={20} />
                ) : (
                  <EyeIcon size={20} />
                )}
              </Button>
              <Button
                variant="info"
                size="icon"
                title="Открыть ссылку"
                onClick={() => {
                  openWindow(`Выполнение`, item.link, item.description);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  openUrl(item.link);
                }}
              >
                <ExternalLink size={18} />
              </Button>
            </div>
          </section>
        ))}
      </section>
    </main>
  );
}

export default LogicalWheel;
