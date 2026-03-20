import { memo, useMemo } from "react";
import { Cell as CellType } from "@/types/cell";
import {
  CELL_SIZE,
  CELL_GAP,
  GRID_COLS,
  GRID_ROWS,
  getCellCenter,
} from "@/lib/cell.utils";
import { DataStore } from "@/types/store";

interface ArrowTabletopProps {
  cells: {
    start: CellType | undefined;
    final: CellType | undefined;
    grid: CellType[][];
  };
  type: DataStore["arrowType"];
}

interface ArrowData {
  fromCell: number;
  toCell: number;
  type: "ladders" | "snakes";
  path: string;
  arrowEnd: { x: number; y: number };
  arrowAngle: number;
}

function ArrowTabletop({ cells, type }: ArrowTabletopProps) {
  const arrows = useMemo(() => {
    const allCells: CellType[] = [];

    if (cells.start) allCells.push(cells.start);
    cells.grid.forEach((row) => allCells.push(...row));
    if (cells.final) allCells.push(cells.final);

    const arrowData: ArrowData[] = [];

    allCells.forEach((cell) => {
      if (cell.ladderTo && cell.ladderTo > 0) {
        const fromCell = cell.number;
        const toCell = cell.ladderTo;
        const from = getCellCenter(fromCell);
        const to = getCellCenter(toCell);
        const path = `M ${from.x} ${from.y} L ${to.x} ${to.y}`;

        arrowData.push({
          fromCell,
          toCell,
          type: "ladders",
          path,
          arrowEnd: to,
          arrowAngle: 0,
        });
      }

      if (cell.snakeTo && cell.snakeTo > 0) {
        const fromCell = cell.number;
        const toCell = cell.snakeTo;
        const from = getCellCenter(fromCell);
        const to = getCellCenter(toCell);
        const path = `M ${from.x} ${from.y} L ${to.x} ${to.y}`;

        arrowData.push({
          fromCell,
          toCell,
          type: "snakes",
          path,
          arrowEnd: to,
          arrowAngle: 0,
        });
      }
    });

    return arrowData;
  }, [cells]);

  const rowHeight = CELL_SIZE + CELL_GAP;
  const totalWidth = GRID_COLS * rowHeight + CELL_SIZE + CELL_GAP * 2;
  const totalHeight = (GRID_ROWS + 2) * rowHeight + CELL_SIZE + CELL_GAP * 2;

  return (
    <svg
      className="pointer-events-none absolute top-0 left-0"
      width={totalWidth}
      height={totalHeight}
      style={{
        transform: `translate(-${CELL_GAP}px, -${CELL_GAP}px)`,
      }}
    >
      <defs>
        <marker
          id="arrowhead-ladder"
          markerWidth="12"
          markerHeight="10"
          refX="10"
          refY="5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon
            points="0 0, 12 5, 0 10"
            fill="#22c55e"
            stroke="#166534"
            strokeWidth="1"
          />
        </marker>
        <marker
          id="arrowhead-snake"
          markerWidth="12"
          markerHeight="10"
          refX="10"
          refY="5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon
            points="0 0, 12 5, 0 10"
            fill="#ef4444"
            stroke="#991b1b"
            strokeWidth="1"
          />
        </marker>
      </defs>

      {arrows.map((arrow, index) => {
        if (type === "none") return null;
        if (type !== "arrows" && type !== "all" && arrow.type !== type)
          return null;
        return (
          <g key={`${arrow.fromCell}-${arrow.toCell}-${index}`}>
            <path
              d={arrow.path}
              fill="none"
              stroke={arrow.type === "ladders" ? "#166534" : "#991b1b"}
              strokeWidth="7"
              strokeLinecap="round"
            />
            <path
              d={arrow.path}
              fill="none"
              stroke={arrow.type === "ladders" ? "#22c55e" : "#ef4444"}
              strokeWidth="5"
              strokeLinecap="round"
              markerEnd={
                arrow.type === "ladders"
                  ? "url(#arrowhead-ladder)"
                  : "url(#arrowhead-snake)"
              }
            />
          </g>
        );
      })}
    </svg>
  );
}

export default memo(ArrowTabletop);
