export function getCellClass(type: "start" | "finish" | "grid") {
  const cellClass =
    "relative flex w-42 h-42 border-2 rounded items-center justify-center overflow-hidden";

  const cellMap = {
    start: "bg-green-500/20",
    finish: "bg-red-500/20",
    grid: "bg-card",
  };

  return cellClass + " " + cellMap[type as keyof typeof cellMap];
}

export function translateCell(type: "start" | "finish") {
  const cellMap = {
    start: "СТАРТ",
    finish: "ФИНИШ",
  };

  return cellMap[type as keyof typeof cellMap];
}
