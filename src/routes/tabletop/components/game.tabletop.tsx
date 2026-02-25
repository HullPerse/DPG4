import { Cell as CellType } from "@/types/cell";
import { User } from "@/types/user";
import { memo, RefObject, useCallback, useEffect } from "react";
import { useControls } from "react-zoom-pan-pinch";
import { useUserStore } from "@/store/user.store";
import { Cell } from "./cell.tabletop";

function GameArea({
  cells,
  users,
  setCell,
  setControl,
}: {
  cells: {
    start: CellType | undefined;
    final: CellType | undefined;
    grid: CellType[][];
  };
  users: User[];
  initialMount: RefObject<boolean>;
  setCell: (value: number | null) => void;
  setControl: (value: boolean) => void;
}) {
  const { zoomToElement } = useControls();
  const user = useUserStore((state) => state.user);
  const isAdmin = useUserStore((state) => state.isAdmin);

  const userId = user?.id;

  const zoomToUser = useCallback(() => {
    if (!userId) return;
    setTimeout(() => {
      const element = document.getElementById(`user-${userId}`);
      if (element) {
        zoomToElement(`user-${userId}`, 1);
      }
    }, 100);
  }, [userId, zoomToElement]);

  return (
    <main className="flex flex-col items-start gap-2">
      {cells.start && (
        <Cell
          key={cells.start.id}
          cell={cells.start}
          users={users}
          isAdmin={isAdmin}
          setCell={setCell}
          setControl={setControl}
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
                setCell={setCell}
                setControl={setControl}
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
          setCell={setCell}
          setControl={setControl}
        />
      )}
    </main>
  );
}

export default memo(GameArea);
