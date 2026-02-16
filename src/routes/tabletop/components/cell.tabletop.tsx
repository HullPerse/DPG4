import { memo, useState } from "react";
import { Cell as CellType } from "@/types/cell";
import { User } from "@/types/user";
import { getCellClass, translateCell } from "@/lib/cell.utils";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.component";
import Settings from "./settings.tabletop";
import { cellsConfig } from "@/config/cells.config";

function CellComponent({
  cell,
  users,
  isAdmin,
}: {
  cell: CellType;
  users: User[];
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger disabled={!isAdmin}>
        <main className={getCellClass(cell.type)}>
          {/* user */}
          <section className="absolute left-0 top-0 w-full h-full">
            {users
              .filter((user) => user.position === cell.number)
              .map((user) => (
                <span key={user.id} id={`user-${user.id}`}>
                  {user.avatar}
                </span>
              ))}
          </section>
          {/* difficulty */}
          <div
            className="absolute right-0 top-0 w-2 h-2"
            style={{
              backgroundColor: cellsConfig.difficulty.find(
                (item) => item.label === cell.difficulty,
              )?.color,
            }}
          />
          <span>
            {["start", "finish"].includes(cell.type)
              ? translateCell(cell.type as "start" | "finish")
              : cell.number}
          </span>
        </main>
      </DialogTrigger>
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
