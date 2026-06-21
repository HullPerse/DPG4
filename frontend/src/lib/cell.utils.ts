export function getCellClass() {
  const cellClass =
    "relative flex flex-col gap-1 w-42 h-42 border-2 rounded items-center overflow-hidden bg-background";

  return cellClass;
}

const START_FINISH = new Set(["start", "finish"]);

export function translateCell(
  type: "start" | "finish" | string,
  number?: number,
) {
  if (!START_FINISH.has(type)) return number;

  const cellMap = {
    start: "СТАРТ",
    finish: "ФИНИШ",
  };

  return cellMap[type as keyof typeof cellMap];
}

export const CELL_SIZE = 168;
export const CELL_GAP = 8;
export const GRID_COLS = 10;
export const GRID_ROWS = 10;

export interface Point {
  x: number;
  y: number;
}

function getGridPosition(cellNumber: number): {
  row: number;
  col: number;
} {
  if (cellNumber < 1 || cellNumber > 100) {
    return { row: -1, col: -1 };
  }

  const zeroBasedIndex = cellNumber - 1;
  const row = Math.floor(zeroBasedIndex / GRID_COLS);
  const isOddRow = row % 2 === 1;
  const col = isOddRow
    ? GRID_COLS - 1 - (zeroBasedIndex % GRID_COLS)
    : zeroBasedIndex % GRID_COLS;

  return { row, col };
}

export function getCellCenter(cellNumber: number): Point {
  const rowHeight = CELL_SIZE + CELL_GAP;

  if (cellNumber === 0) {
    return {
      x: CELL_SIZE / 2,
      y: CELL_SIZE / 2,
    };
  }

  if (cellNumber === 101) {
    return {
      x: GRID_COLS * rowHeight + CELL_SIZE / 2,
      y: (GRID_ROWS + 1) * rowHeight + CELL_SIZE / 2,
    };
  }

  const { row, col } = getGridPosition(cellNumber);

  return {
    x: col * rowHeight + CELL_SIZE / 2,
    y: (row + 1) * rowHeight + CELL_SIZE / 2,
  };
}


