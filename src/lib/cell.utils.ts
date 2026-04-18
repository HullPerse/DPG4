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

export enum Direction {
  TOP = 0,
  TOP_RIGHT = 1,
  RIGHT = 2,
  BOTTOM_RIGHT = 3,
  BOTTOM = 4,
  BOTTOM_LEFT = 5,
  LEFT = 6,
  TOP_LEFT = 7,
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

export function getCellEdgePoint(
  cellNumber: number,
  direction: Direction,
): Point {
  const center = getCellCenter(cellNumber);
  const halfSize = CELL_SIZE / 2;
  const cornerOffset = halfSize * 0.7;

  const offsets: Record<Direction, Point> = {
    [Direction.TOP]: { x: 0, y: -halfSize },
    [Direction.TOP_RIGHT]: { x: cornerOffset, y: -cornerOffset },
    [Direction.RIGHT]: { x: halfSize, y: 0 },
    [Direction.BOTTOM_RIGHT]: { x: cornerOffset, y: cornerOffset },
    [Direction.BOTTOM]: { x: 0, y: halfSize },
    [Direction.BOTTOM_LEFT]: { x: -cornerOffset, y: cornerOffset },
    [Direction.LEFT]: { x: -halfSize, y: 0 },
    [Direction.TOP_LEFT]: { x: -cornerOffset, y: -cornerOffset },
  };

  return {
    x: center.x + offsets[direction].x,
    y: center.y + offsets[direction].y,
  };
}

export function calculateDirection(
  fromCell: number,
  toCell: number,
): Direction {
  const from = getCellCenter(fromCell);
  const to = getCellCenter(toCell);

  const dx = to.x - from.x;
  const dy = to.y - from.y;

  const angle = Math.atan2(dy, dx);
  const degrees = (angle * 180) / Math.PI;

  switch (true) {
    case degrees >= -22.5 && degrees < 22.5:
      return Direction.RIGHT;
    case degrees >= 22.5 && degrees < 67.5:
      return Direction.BOTTOM_RIGHT;
    case degrees >= 67.5 && degrees < 112.5:
      return Direction.BOTTOM;
    case degrees >= 112.5 && degrees < 157.5:
      return Direction.BOTTOM_LEFT;
    case degrees >= 157.5 || degrees < -157.5:
      return Direction.LEFT;
    case degrees >= -157.5 && degrees < -112.5:
      return Direction.TOP_LEFT;
    case degrees >= -112.5 && degrees < -67.5:
      return Direction.TOP;
    default:
      return Direction.TOP_RIGHT;
  }
}

export function getOppositeDirection(direction: Direction): Direction {
  const opposites: Record<Direction, Direction> = {
    [Direction.TOP]: Direction.BOTTOM,
    [Direction.TOP_RIGHT]: Direction.BOTTOM_LEFT,
    [Direction.RIGHT]: Direction.LEFT,
    [Direction.BOTTOM_RIGHT]: Direction.TOP_LEFT,
    [Direction.BOTTOM]: Direction.TOP,
    [Direction.BOTTOM_LEFT]: Direction.TOP_RIGHT,
    [Direction.LEFT]: Direction.RIGHT,
    [Direction.TOP_LEFT]: Direction.BOTTOM_RIGHT,
  };

  return opposites[direction];
}

export function calculateArrowEndpoints(
  fromCell: number,
  toCell: number,
): { start: Point; end: Point } {
  const direction = calculateDirection(fromCell, toCell);
  const oppositeDirection = getOppositeDirection(direction);

  const toEdge = getCellEdgePoint(toCell, oppositeDirection);

  const fromDirection = getOppositeDirection(direction);
  const startOffset = getCellEdgePoint(fromCell, fromDirection);

  return {
    start: startOffset,
    end: toEdge,
  };
}

export function calculateArrowPath(fromCell: number, toCell: number): string {
  const { start, end } = calculateArrowEndpoints(fromCell, toCell);

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  const controlPointOffset = Math.min(distance * 0.3, 100);

  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;

  const perpX = (-dy / distance) * controlPointOffset;
  const perpY = (dx / distance) * controlPointOffset;

  const ctrlX = midX + perpX;
  const ctrlY = midY + perpY;

  return `M ${start.x} ${start.y} Q ${ctrlX} ${ctrlY} ${end.x} ${end.y}`;
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

  if (!cell)
    return { path: [...path, currentPosition], finalPosition: currentPosition };

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
