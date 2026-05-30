import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { adminFetch } from "@/adminApi";
import { cn } from "@/lib/utils";

type CellRow = {
  id: string;
  type: string;
  number: number;
  title: string;
  cellType: string;
  ladderTo: number;
  snakeTo: number;
};

export function CellsBoardPage() {
  const navigate = useNavigate();
  const [cells, setCells] = useState<CellRow[]>([]);

  useEffect(() => {
    adminFetch<{ data: CellRow[] }>(
      "/api/admin/data/cells?_perPage=200&_sort=number&_order=ASC",
    ).then((r) => setCells(r.data));
  }, []);

  const { start, final, grid } = useMemo(() => {
    const start = cells.find((c) => c.type === "start");
    const final = cells.find((c) => c.number === 101);
    const other = cells
      .filter((c) => c.type !== "start" && c.number !== 101)
      .sort((a, b) => a.number - b.number);
    const grid: CellRow[][] = [];
    for (let i = 0; i < 10; i++) {
      const row = other.slice(i * 10, (i + 1) * 10);
      grid.push(i % 2 === 1 ? [...row].reverse() : row);
    }
    return { start, final, grid };
  }, [cells]);

  const cellClass = (cell: CellRow) =>
    cn(
      "w-[72px] min-h-14 cursor-pointer border-2 p-1 text-[10px] leading-tight transition-colors hover:-translate-y-0.5",
      cell.ladderTo > 0 && "border-green-500/50 bg-green-500/10",
      cell.snakeTo > 0 && "border-love/50 bg-love/10",
      !cell.ladderTo && !cell.snakeTo && "border-highlight-high bg-highlight-low",
    );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Поле (tabletop)</h1>
      <div className="mt-2 flex flex-wrap gap-2">
        <Link
          to="/"
          className="text-muted hover:text-text inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" />
          На главную
        </Link>
        <Link
          to="/cells"
          className="border-highlight-high hover:border-iris border-2 px-3 py-1 text-xs font-bold"
        >
          Таблица cells
        </Link>
        <Link
          to="/rules"
          className="border-highlight-high hover:border-iris border-2 px-3 py-1 text-xs font-bold"
        >
          Правила
        </Link>
      </div>

      <div className="border-highlight-high bg-card mt-4 overflow-auto border-2 p-4 shadow-sharp-sm">
        {start && (
          <button
            type="button"
            className={cn(cellClass(start), "border-primary/50 mb-2")}
            onClick={() => navigate(`/cells/${start.id}`)}
          >
            <strong>START</strong>
            <div>{start.title || start.cellType}</div>
          </button>
        )}
        <div className="flex flex-col gap-1">
          {grid.map((row, ri) => (
            <div key={ri} className="flex gap-1">
              {row.map((cell) => (
                <button
                  key={cell.id}
                  type="button"
                  className={cellClass(cell)}
                  title={cell.id}
                  onClick={() => navigate(`/cells/${cell.id}`)}
                >
                  <strong>#{cell.number}</strong>
                  <div>{cell.title || cell.cellType || "—"}</div>
                  {cell.ladderTo > 0 && <div>↑{cell.ladderTo}</div>}
                  {cell.snakeTo > 0 && <div>↓{cell.snakeTo}</div>}
                </button>
              ))}
            </div>
          ))}
        </div>
        {final && (
          <button
            type="button"
            className={cn(cellClass(final), "border-primary/50 mt-2")}
            onClick={() => navigate(`/cells/${final.id}`)}
          >
            <strong>FINISH</strong>
            <div>{final.title || final.cellType}</div>
          </button>
        )}
      </div>
    </div>
  );
}
