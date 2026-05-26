import { Button } from "@/components/ui/button.component";
import { Brush, ChevronLeft, Eraser, Move, PaintBucket } from "lucide-react";
import { useState } from "react";

type ToolType = "brush" | "eraser" | "bucket" | "move";

const Tools = [
  { value: "brush", label: "Карандаш", icon: <Brush /> },
  { value: "eraser", label: "Ластик", icon: <Eraser /> },
  { value: "bucket", label: "Заливка", icon: <PaintBucket /> },
  { value: "move", label: "Двигать", icon: <Move /> },
];

function DrawPage({
  setTab,
}: {
  setTab: (value: "home" | "draw" | "list" | "profile") => void;
}) {
  const [tool, setTool] = useState<ToolType>("brush");

  return (
    <main className="flex flex-row w-full h-full">
      <div className="flex flex-col w-45 border-r-2 border-highlight-high p-2">
        <div className="grid grid-cols-2 gap-2">
          {Tools.map((button) => (
            <Button
              title={button.label}
              variant="link"
              className="text-text hover:bg-text/20 disabled:bg-text/20 disabled:text-primary disabled:opacity-85 shadow-sharp-sm border w-20"
              disabled={tool === button.value}
              onClick={() => setTool(button.value as ToolType)}
            >
              {button.icon}
            </Button>
          ))}
        </div>

        <div className="mt-auto flex flex-row gap-1">
          <Button variant="error" size="icon" onClick={() => setTab("home")}>
            <ChevronLeft />
          </Button>
          <Button variant="success" className="flex-1">
            Сохранить
          </Button>
        </div>
      </div>
      <div className="flex flex-col flex-1">600x450</div>
    </main>
  );
}

export default DrawPage;
