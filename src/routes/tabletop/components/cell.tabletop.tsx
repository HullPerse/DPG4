import { memo, useCallback, useEffect, useState } from "react";
import { Cell as CellType } from "@/types/cell";
import { User } from "@/types/user";
import { getCellClass, translateCell } from "@/lib/cell.utils";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.component";
import Settings from "./settings.tabletop";
import { cellsConfig } from "@/config/cells.config";
import { useDataStore } from "@/store/data.store";
import {
  Box,
  ChevronDown,
  ChevronUp,
  CircleQuestionMark,
  Sword,
  Swords,
  TrafficCone,
} from "lucide-react";
import { Button } from "@/components/ui/button.component";

function CellComponent({
  cell,
  users,
  isAdmin,
  setCell,
  setControl,
}: {
  cell: CellType;
  users: User[];
  isAdmin: boolean;
  setCell: (value: any) => void;
  setControl: (value: boolean) => void;
}) {
  const isEditing = useDataStore((state) => state.isEditing);

  const [open, setOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const statusesPerPage = 5;

  const color = cellsConfig.difficulty.find(
    (item) =>
      item.label === cell.difficulty &&
      !["start", "finish"].includes(cell.type),
  )?.color;

  const textColor = (type: CellType["type"]) => {
    if (type === "start") return "green";
    if (type === "finish") return "red";

    return color;
  };

  const getCellType = (type: string) => {
    const cellTypeMap = {
      Игра: <Sword />,
      Пресет: <Swords />,
      Просмотр: <TrafficCone />,
    };

    return cellTypeMap[type as keyof typeof cellTypeMap] ?? <Box />;
  };

  const computeStatusPages = useCallback(() => {
    if (!cell?.status?.length) return { statuses: [], totalPages: 0 };

    const statusCounts = cell.status.reduce(
      (acc: { [key: string]: number }, status: string) => {
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      {},
    );

    const sortedStatuses = Object.entries(statusCounts).sort(
      (a, b) => b[1] - a[1],
    );

    const totalPages = Math.ceil(sortedStatuses.length / statusesPerPage);

    const currentPageStatuses = sortedStatuses
      .slice((currentPage - 1) * statusesPerPage, currentPage * statusesPerPage)
      .map(([status, count]) => ({
        status,
        count,
      }));

    return {
      statuses: currentPageStatuses,
      totalPages,
    };
  }, [cell?.status, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [cell.id]);

  return (
    <Dialog open={isEditing && isAdmin ? open : false} onOpenChange={setOpen}>
      <button
        onClick={() => {
          if (isEditing && isAdmin) return setOpen(true);
          setControl(true);
          setCell(cell.id);
        }}
      >
        <main className={getCellClass()}>
          {/* cell info */}
          <section className="flex flex-row w-full h-10 border-b bg-card items-center justify-between p-0.5">
            {/* cell number */}
            <span
              className="ml-1 font-bold"
              style={{
                color: textColor(cell.type),
              }}
            >
              {translateCell(cell.type, cell.number)}
            </span>
            {/* game type */}
            <div className="bg-background w-6 h-6 rounded border border-highlight-high flex items-center justify-center">
              {getCellType(cell.cellType)}
            </div>
          </section>
          {/* users */}
          <section className="flex flex-row flex-wrap items-start w-full h-full gap-2 p-1">
            {cell.title}
            {users
              .filter((user) => user.position === cell.number)
              .map((user) => (
                <span
                  key={user.id}
                  id={`user-${user.id}`}
                  className="border border-highlight-low rounded-full w-6 h-6 flex items-center justify-center"
                  style={{
                    backgroundColor: user.color,
                  }}
                >
                  {user.avatar}
                </span>
              ))}
          </section>

          {/* cell status */}
          <section className="flex flex-row w-full h-8 min-h-8 max-h-8 border-t bg-card p-1 gap-1 items-center justify-between">
            <div className="flex flex-row gap-1">
              {computeStatusPages().statuses.map(({ status, count }) => {
                const statusData =
                  cellsConfig.status.find((item) => item.name === status) ??
                  null;

                return (
                  <div
                    key={status}
                    className="relative bg-background w-6 h-6 rounded border border-highlight-high flex items-center justify-center"
                  >
                    {statusData?.icon ?? <CircleQuestionMark />}

                    <span className="absolute -top-2 -right-0.5 mt-px text-xs font-bold text-primary">
                      {count > 1 ? count : null}
                    </span>
                  </div>
                );
              })}
            </div>

            {computeStatusPages().totalPages > 1 && (
              <div
                className="flex flex-col"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentPage(currentPage - 1);
                  }}
                  disabled={currentPage === 1}
                  className="size-4 opacity-75 hover:opacity-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronUp />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentPage(currentPage + 1);
                  }}
                  disabled={currentPage >= computeStatusPages().totalPages}
                  className="size-4 opacity-75 hover:opacity-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronDown />
                </Button>
              </div>
            )}
          </section>
        </main>
      </button>
      <DialogContent className="min-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Клетка:{" "}
            {["start", "finish"].includes(cell.type)
              ? translateCell(cell.type)
              : cell.number}
          </DialogTitle>
        </DialogHeader>
        <Settings cell={cell} setOpen={setOpen} />
      </DialogContent>
    </Dialog>
  );
}

export const Cell = memo(CellComponent);
