import { Cell as CellType } from "@/types/cell";
import { User } from "@/types/user";
import { memo, RefObject, useCallback, useEffect } from "react";
import { useUserStore } from "@/store/user.store";
import { Cell } from "./cell.tabletop";
import ArrowTabletop from "./arrow.tabletop";
import { useDataStore } from "@/store/data.store";

function GameArea({
  cells,
  users,
  initialMount,
  setCell,
  setControl,
  requestZoomToUser,
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
  requestZoomToUser: (userId: string) => void;
}) {
  const user = useUserStore((state) => state.user);
  const isAdmin = useUserStore((state) => state.isAdmin);
  const arrowType = useDataStore((state) => state.arrowType);

  const userId = user?.id;

  const zoomToUser = useCallback(() => {
    if (!userId) return;
    requestZoomToUser(userId);
  }, [userId, requestZoomToUser]);

  useEffect(() => {
    if (initialMount.current) {
      zoomToUser();
      initialMount.current = false;
    }
  }, [initialMount, zoomToUser]);

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

      {arrowType !== "none" && <ArrowTabletop cells={cells} type={arrowType} />}
    </main>
  );
}

export default memo(GameArea);
