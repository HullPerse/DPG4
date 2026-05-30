export const GRID_COLS = 10;

export function getGridPosition(cellNumber: number): { row: number; col: number } {
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

export function getLastCellInRow(row: number): number {
  return row * 10 + (row % 2 === 0 ? 10 : 1);
}

export function getFirstCellInNextRow(currentRow: number): number {
  const nextRow = currentRow + 1;
  return nextRow * 10 + (nextRow % 2 === 0 ? 1 : 10);
}
