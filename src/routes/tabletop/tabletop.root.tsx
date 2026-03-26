import CellApi from "@/api/cell.api";
import { WindowError } from "@/components/shared/error.component";
import { WindowLoader } from "@/components/shared/loader.component";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleX, Menu, ToolCase } from "lucide-react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import GameArea from "./components/game.tabletop";
import { Cell } from "@/types/cell";
import { useSubscription } from "@/hooks/subscription.hook";
import { startTransition, useCallback, useRef, useState } from "react";
import UserApi from "@/api/user.api";
import { User } from "@/types/user";
import Controls from "./components/controls.tabletop";
import { useDataStore } from "@/store/data.store";
import ToolsTaletop from "./components/tools.taletop";

const cellApi = new CellApi();
const userApi = new UserApi();

export default function Tabletop() {
  const queryClient = useQueryClient();
  const { isEditing, setEditing } = useDataStore((state) => state);

  const [cell, setCell] = useState<number | null>(null);
  const [control, setControl] = useState<boolean>(false);
  const [showTools, setShowTools] = useState<boolean>(false);

  const initialMount = useRef<boolean>(true);
  const zoomToUserRef = useRef<{ userId: string } | null>(null);
  const zoomCompleted = useRef(false);

  const { data, isLoading, isError, refetch } = useQuery<{
    cells: {
      start: Cell | undefined;
      final: Cell | undefined;
      grid: Cell[][];
    };
    users: User[];
  }>({
    queryKey: ["cells"],
    queryFn: async () => {
      const cells = await cellApi.getCells();
      const users = await userApi.getUserPositions();

      const startCell = cells.find((cell) => cell.type === "start");
      const finalCell = cells.find((cell) => cell.number === 101);
      const otherCells = cells
        .filter((cell) => cell.type !== "start" && cell.number !== 101)
        .sort((a, b) => a.number - b.number);

      const gridCells: Cell[][] = [];
      for (let i = 0; i < 10; i++) {
        const rowCells = otherCells.slice(i * 10, (i + 1) * 10);
        if (i % 2 === 1) {
          gridCells.push(rowCells.reverse());
        } else {
          gridCells.push(rowCells);
        }
      }

      return {
        cells: {
          start: startCell,
          final: finalCell,
          grid: gridCells,
        },
        users: users,
      };
    },
    staleTime: 60 * 1000 * 5, // 5 minutes
    gcTime: 60 * 1000 * 5, // 5 minutes
  });

  const invalidateQuery = useCallback(() => {
    startTransition(() => {
      queryClient.invalidateQueries({
        queryKey: ["cells"],
        refetchType: "all",
      });
    });
  }, [queryClient]);

  useSubscription("cells", "*", invalidateQuery);
  useSubscription("users", "*", invalidateQuery);

  if (isLoading) return <WindowLoader />;
  if (isError)
    return (
      <WindowError
        error={new Error("Ошибка загрузки данных")}
        icon={<CircleX className="size-28 animate-pulse text-red-500" />}
        refresh={refetch}
        button
      />
    );

  return (
    <main className="relative flex h-full w-full items-center justify-center overflow-clip">
      {/* ADMIN TABLETOP TOOLS */}
      {showTools && (
        <ToolsTaletop
          setShowTools={setShowTools}
          isEditing={isEditing}
          setEditing={setEditing}
        />
      )}

      {/* CONTROLS */}
      {control ? (
        <Controls setControls={setControl} cell={cell} setCell={setCell} />
      ) : (
        <>
          <button
            className="absolute top-2 left-2 z-500 cursor-pointer rounded border p-1 text-muted hover:text-text"
            title="Меню"
            onClick={() => setControl(true)}
          >
            <Menu />
          </button>

          {!showTools && (
            <button
              className="absolute top-11 left-2 z-500 cursor-pointer rounded border p-1 text-muted hover:text-text"
              title="Инструменты"
              onClick={() => setShowTools(true)}
            >
              <ToolCase />
            </button>
          )}
        </>
      )}

      {/* GAME AREA */}
      <TransformWrapper
        limitToBounds={false}
        initialScale={0.4}
        minScale={0.1}
        maxScale={5}
        centerOnInit={!initialMount.current}
        panning={{
          allowLeftClickPan: false,
          allowMiddleClickPan: false,
          allowRightClickPan: true,
        }}
        wheel={{ step: 0.1 }}
        onTransformed={(ref) => {
          if (zoomCompleted.current) return;
          if (zoomToUserRef.current) {
            const { userId } = zoomToUserRef.current;
            const element = document.getElementById(`user-${userId}`);
            if (element) {
              ref.zoomToElement(element, 1);
              zoomToUserRef.current = null;
              zoomCompleted.current = true;
            }
          }
        }}
      >
        <TransformComponent
          contentStyle={{ height: "100%" }}
          wrapperStyle={{ width: "100%", height: "100%" }}
        >
          <GameArea
            cells={
              data?.cells || { start: undefined, final: undefined, grid: [] }
            }
            users={data?.users || []}
            initialMount={initialMount}
            setCell={setCell}
            setControl={setControl}
            requestZoomToUser={(userId) => {
              zoomToUserRef.current = { userId };
            }}
          />
        </TransformComponent>
      </TransformWrapper>
    </main>
  );
}
