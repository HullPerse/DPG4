import { memo, useState } from "react";
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
import { Box, Sword, Swords, TrafficCone } from "lucide-react";

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

  function getCellType(type: string) {
    const cellTypeMap = {
      Игра: <Sword />,
      Пресет: <Swords />,
      Просмотр: <TrafficCone />,
    };

    return cellTypeMap[type as keyof typeof cellTypeMap] ?? <Box />;
  }

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
          <section className="flex flex-row w-full h-10 border-t bg-card p-1">
            {cell.status &&
              cell.status.map((status, index) => {
                const statusData =
                  cellsConfig.status.find((item) => item.name === status) ??
                  null;

                if (!statusData) return null;

                return (
                  <div
                    key={index}
                    className="bg-background w-6 h-6 rounded border border-highlight-high flex items-center justify-center"
                  >
                    {statusData?.icon}
                  </div>
                );
              })}
          </section>
        </main>
      </button>

      <DialogContent className="min-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Клетка: {cell.number}
          </DialogTitle>
        </DialogHeader>
        <Settings cell={cell} setOpen={setOpen} />
      </DialogContent>
    </Dialog>
  );
}

export const Cell = memo(CellComponent);
