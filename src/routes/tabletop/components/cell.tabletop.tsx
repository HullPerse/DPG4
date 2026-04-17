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
  Crown,
  Sword,
  Swords,
  TrafficCone,
} from "lucide-react";
import { Button } from "@/components/ui/button.component";
import LadderSvg from "@/components/svg/ladder.component";
import SnakeSvg from "@/components/svg/snake.component";
import SteamSvg from "@/components/svg/steam.component";
import { getPlaceColor } from "@/lib/utils";

function CellComponent({
  cell,
  users,
  isAdmin,
  setCell,
  setControl,
  movingUserId,
}: {
  cell: CellType;
  users: User[];
  isAdmin: boolean;
  setCell: (value: any) => void;
  setControl: (value: boolean) => void;
  movingUserId?: string;
}) {
  const isEditing = useDataStore((state) => state.isEditing);
  const arrowType = useDataStore((state) => state.arrowType);

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
      Стим: <SteamSvg />,
      Просмотр: <TrafficCone />,
    };

    return cellTypeMap[type as keyof typeof cellTypeMap] ?? <Box />;
  };

  const getCellArrows = (destination: number) => {
    const snake = cell.snakeTo > 0 ? "snakes" : null;
    const ladder = cell.ladderTo > 0 ? "ladders" : null;
    const arrowType = snake || ladder;

    const arrowMap = {
      snakes: <SnakeSvg className="text-red-500" />,
      ladders: <LadderSvg className="text-green-500" />,
    };
    return (
      <div className="absolute">
        {arrowMap[arrowType as keyof typeof arrowMap]}
        <span className="absolute -top-1.5 -right-0.5 text-xs font-bold text-text">
          {destination}
        </span>
      </div>
    );
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
          <section className="flex h-10 w-full flex-row items-center justify-between border-b bg-card p-0.5">
            {/* cell number */}
            <span
              className="ml-1 font-bold"
              style={{
                color: textColor(cell.type),
              }}
            >
              {translateCell(cell.type, cell.number)}
            </span>

            <div className="flex flex-row gap-1">
              {/* ladders and snakes */}
              {["icons", "all"].includes(arrowType) &&
                (cell.snakeTo > 0 || cell.ladderTo > 0) && (
                  <div className="flex h-6 w-6 items-center justify-center rounded border border-highlight-high bg-background">
                    {getCellArrows(
                      cell.ladderTo > 0 ? cell.ladderTo : cell.snakeTo,
                    )}
                  </div>
                )}

              {/* game type */}
              <div className="flex h-6 w-6 items-center justify-center rounded border border-highlight-high bg-background">
                {getCellType(cell.cellType)}
              </div>

              {/* captured amount */}

              {cell.captured && (
                <div
                  className="flex h-6 w-6 items-center justify-center rounded border border-highlight-high bg-background font-bold"
                  style={{
                    color: (() => {
                      const count = cell.captured?.length || 0;
                      if (count === 0) return "hsl(var(--background) / 0.8)";
                      if (count <= 1) return "hsl(142 76% 36% / 0.8)";
                      if (count <= 2) return "hsl(173 80% 40% / 0.8)";
                      if (count <= 3) return "hsl(43 96% 56% / 0.8)";
                      if (count <= 4) return "hsl(25 95% 53% / 0.8)";
                      return "hsl(0 84% 60% / 0.8)";
                    })(),
                  }}
                >
                  {cell.captured.length}
                </div>
              )}
            </div>
          </section>
          {/* users */}
          <section className="flex h-full w-full flex-row flex-wrap items-start gap-2 p-1">
            {users
              .filter(
                (user) =>
                  user.position === cell.number && user.id !== movingUserId,
              )
              .map((user) => (
                <span
                  key={user.id}
                  id={`user-${user.id}`}
                  className="relative flex h-8 w-8 items-center justify-center rounded-full border border-highlight-low"
                  style={{
                    backgroundColor: user.color,
                  }}
                >
                  {user.place !== "0" && (
                    <div className="absolute -top-2 -right-2 rotate-45">
                      <Crown
                        className="relative size-4"
                        style={{
                          fill: getPlaceColor(user.place),
                          color: getPlaceColor(user.place),
                        }}
                      />

                      <span className="absolute top-1 right-1.5 text-[6px] font-bold text-black">
                        {user.place}
                      </span>
                    </div>
                  )}

                  {user.avatar}
                </span>
              ))}
          </section>

          {/* cell status */}
          <section className="flex h-8 max-h-8 min-h-8 w-full flex-row items-center justify-between gap-1 border-t bg-card p-1">
            <div className="flex flex-row gap-1">
              {computeStatusPages().statuses.map(({ status, count }) => {
                const statusData =
                  cellsConfig.status.find((item) => item.name === status) ??
                  null;

                return (
                  <div
                    key={status}
                    className="relative flex h-6 w-6 items-center justify-center rounded border border-highlight-high bg-background"
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
                  className="size-4 opacity-75 hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-30"
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
                  className="size-4 opacity-75 hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-30"
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
