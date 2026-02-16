import { Cell as CellType } from "@/types/cell";
import { User } from "@/types/user";
import { useCallback, useEffect } from "react";
import { useControls } from "react-zoom-pan-pinch";
import { useUserStore } from "@/store/user.store";
import { Cell } from "./cell.tabletop";

export default function GameArea({
  cells,
  users,
}: {
  cells: {
    start: CellType | undefined;
    final: CellType | undefined;
    grid: CellType[][];
  };
  users: User[];
}) {
  const { zoomToElement } = useControls();
  const user = useUserStore((state) => state.user);
  const isAdmin = useUserStore((state) => state.isAdmin);

  const zoomToUser = useCallback(() => {
    if (!user?.id) return;

    setTimeout(() => {
      const element = document.getElementById(`user-${user.id}`);
      if (element) {
        zoomToElement(`user-${user.id}`, 1);
      }
    }, 100);
  }, [user?.id, zoomToElement]);

  useEffect(() => {
    zoomToUser();
  }, []);

  return (
    <main className="flex flex-col items-start gap-2">
      {cells.start && (
        <Cell
          key={cells.start.id}
          cell={cells.start}
          users={users}
          isAdmin={isAdmin}
        />
      )}

      <div className="flex flex-col gap-2">
        {cells.grid.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-2">
            {row.map((cell, cellIndex) => (
              <Cell
                key={`${rowIndex}-${cellIndex}`}
                cell={cell}
                users={users}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        ))}
      </div>

      {cells.final && (
        <Cell
          key={cells.final.id}
          cell={cells.final}
          users={users}
          isAdmin={isAdmin}
        />
      )}
    </main>
  );
}
