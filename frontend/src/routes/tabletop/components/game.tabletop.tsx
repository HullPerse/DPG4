import { Cell as CellType } from "@/types/cell";
import { User } from "@/types/user";
import { memo, useEffect, useRef } from "react";
import { useTransformContext } from "react-zoom-pan-pinch";
import { useUserStore } from "@/store/user.store";
import { Cell } from "./cell.tabletop";
import ArrowTabletop from "./arrow.tabletop";
import { useDataStore } from "@/store/data.store";
import MovingUserOverlay from "./moving.tabletop";

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
  setCell: (value: number | null) => void;
  setControl: (value: boolean) => void;
}) {
  const instance = useTransformContext();
  const user = useUserStore((state) => state.user);
  const isAdmin = useUserStore((state) => state.isAdmin);
  const arrowType = useDataStore((state) => state.arrowType);
  const movingUser = useDataStore((state) => state.movingUser);
  const zoomed = useRef(false);

  useEffect(() => {
    if (zoomed.current) return;
    if (!user?.id || !users.length) return;
    if (!instance.wrapperComponent || !instance.contentComponent) return;

    const element = document.getElementById(`user-${user.id}`);
    if (element) {
      instance.getContext().zoomToElement(element, 1, 600);
      zoomed.current = true;
    }
  }, [user?.id, users, instance]);

  return (
    <main className=" flex flex-col items-start gap-2">
      {cells.start && (
        <Cell
          key={cells.start.id}
          cell={cells.start}
          users={users}
          isAdmin={isAdmin}
          setCell={setCell}
          setControl={setControl}
          movingUserId={movingUser?.userId}
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
                movingUserId={movingUser?.userId}
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
          movingUserId={movingUser?.userId}
        />
      )}

      {arrowType !== "none" && <ArrowTabletop cells={cells} type={arrowType} />}

      <MovingUserOverlay />
    </main>
  );
}

export default memo(GameArea);
