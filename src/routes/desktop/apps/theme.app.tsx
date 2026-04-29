import { Button } from "@/components/ui/button.component";
import { Input } from "@/components/ui/input.component";
import { memo, useCallback, useEffect, useState } from "react";
import { Palette, RotateCcw } from "lucide-react";

type ThemeColor = {
  name: string;
  variable: string;
  default: string;
};

const themeColors: ThemeColor[] = [
  { name: "Фон", variable: "--color-background", default: "#191724" },
  { name: "Карточка", variable: "--color-card", default: "#232136" },
  { name: "Основной", variable: "--color-primary", default: "#f6c177" },
  { name: "Цвет #1", variable: "--color-iris", default: "#c4a7e7" },
  { name: "Цвет #2", variable: "--color-love", default: "#eb6f92" },
  { name: "Текст", variable: "--color-text", default: "#e0def4" },
  { name: "Текст приглушенный", variable: "--color-muted", default: "#6e6a86" },
  {
    name: "Выделение (1.)",
    variable: "--color-highlight-high",
    default: "#524f67",
  },
  {
    name: "Выделение (2.)",
    variable: "--color-highlight-medium",
    default: "#403d52",
  },
  {
    name: "Выделение (3.)",
    variable: "--color-highlight-low",
    default: "#21202e",
  },
];

function ThemeApp() {
  const [colors, setColors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const root = getComputedStyle(document.documentElement);
    const initial: Record<string, string> = {};
    themeColors.forEach(({ variable }) => {
      initial[variable] = root.getPropertyValue(variable).trim() || "";
    });
    setColors(initial);
  }, []);

  const handleChange = useCallback((variable: string, value: string) => {
    setColors((prev) => ({ ...prev, [variable]: value }));
    document.documentElement.style.setProperty(variable, value);
    setSaved(false);
  }, []);

  const handleReset = useCallback(() => {
    themeColors.forEach(({ variable, default: defaultValue }) => {
      document.documentElement.style.setProperty(variable, defaultValue);
      setColors((prev) => ({ ...prev, [variable]: defaultValue }));
    });
    setSaved(false);
  }, []);

  const handleSave = useCallback(() => {
    const themeData = JSON.stringify(colors);
    localStorage.setItem("custom-theme", themeData);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [colors]);

  return (
    <main className="flex flex-col h-full w-full p-4 gap-3 bg-background overflow-y-auto">
      <header className="flex items-center gap-2 border-b-2 border-highlight-high pb-2">
        <Palette className="size-5 text-primary" />
        <h1 className="text-lg font-bold text-text">Редактор темы</h1>
      </header>

      <section className="flex flex-col gap-3 flex-1">
        {themeColors.map(({ name, variable }) => (
          <div key={variable} className="flex flex-row items-center gap-2">
            <label className="text-sm text-text w-40 shrink-0">{name}</label>
            <div className="flex flex-row items-center gap-2 flex-1">
              <input
                type="color"
                value={colors[variable] || "#000000"}
                onChange={(e) => handleChange(variable, e.target.value)}
                className="size-8 border-2 border-highlight-high cursor-pointer bg-transparent p-0"
              />
              <Input
                value={colors[variable] || ""}
                onChange={(e) => handleChange(variable, e.target.value)}
                className="flex-1 h-8 font-mono text-xs"
              />
            </div>
          </div>
        ))}
      </section>

      <footer className="flex flex-row gap-2 border-t-2 border-highlight-high pt-2">
        <Button
          variant="error"
          size="sm"
          onClick={handleReset}
          className="gap-1"
        >
          <RotateCcw className="size-3" />
          Сброс
        </Button>
        <Button
          variant="success"
          size="sm"
          onClick={handleSave}
          className="flex-1"
        >
          {saved ? "Сохранено!" : "Сохранить тему"}
        </Button>
      </footer>
    </main>
  );
}

export default memo(ThemeApp);
