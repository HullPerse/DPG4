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

export const CELL_SIZE = 168;
export const CELL_GAP = 8;
export const GRID_COLS = 10;
export const GRID_ROWS = 10;

export interface Point {
  x: number;
  y: number;
}

export function getGridPosition(cellNumber: number): {
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

export function calculateMovePath(
  startingPosition: number,
  diceRoll: number,
  cells: { number: number; ladderTo: number; snakeTo: number }[],
): { path: number[]; finalPosition: number } {
  const path: number[] = [];
  const steps: number = diceRoll > 0 ? diceRoll : -diceRoll;
  const direction: number = diceRoll > 0 ? 1 : -1;

  let currentPosition = startingPosition;

  if (startingPosition === 100 && diceRoll > 0) {
    path.push(101);
    return { path, finalPosition: 101 };
  }

  if (startingPosition === 101 && diceRoll > 0) {
    return { path, finalPosition: 101 };
  }

  for (let i = 0; i < steps; i++) {
    currentPosition += direction;

    if (currentPosition < 0) currentPosition = 0;
    if (currentPosition === 100) currentPosition = 101;
    if (currentPosition >= 100) currentPosition = 100;

    path.push(currentPosition);
  }

  const cell = cells.find((c) => c.number === currentPosition);
  if (!cell) {
    return { path: [...path, currentPosition], finalPosition: currentPosition };
  }

  if (diceRoll < 0) {
    if (cell && cell?.snakeTo > 0) {
      currentPosition = cell.snakeTo;
      path.push(currentPosition);
      return {
        path: [...path, currentPosition],
        finalPosition: currentPosition,
      };
    }
    return { path, finalPosition: currentPosition };
  }

  if (cell.ladderTo > 0) {
    currentPosition = cell.ladderTo;
    path.push(currentPosition);
  } else if (cell.snakeTo > 0) {
    currentPosition = cell.snakeTo;
    path.push(currentPosition);
  }

  return { path: [...path, currentPosition], finalPosition: currentPosition };
}

export function getLastCellInRow(row: number): number {
  return row * 10 + (row % 2 === 0 ? 10 : 1);
}

export function getFirstCellInNextRow(currentRow: number): number {
  const nextRow = currentRow + 1;
  return nextRow * 10 + (nextRow % 2 === 0 ? 1 : 10);
}
