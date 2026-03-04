export function getCellClass() {
  const cellClass =
    "relative flex flex-col gap-1 w-42 h-42 border-2 rounded items-center overflow-hidden bg-background";

  return cellClass;
}

export function translateCell(
  type: "start" | "finish" | string,
  number?: number,
) {
  if (!["start", "finish"].includes(type)) return number;

  const cellMap = {
    start: "СТАРТ",
    finish: "ФИНИШ",
  };

  return cellMap[type as keyof typeof cellMap];
}
