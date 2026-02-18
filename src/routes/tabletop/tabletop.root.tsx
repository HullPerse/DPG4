import CellApi from "@/api/cell.api";
import { WindowError } from "@/components/shared/error.component";
import { WindowLoader } from "@/components/shared/loader.component";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleX, Menu } from "lucide-react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import GameArea from "./components/game.tabletop";
import { Cell } from "@/types/cell";
import { useSubscription } from "@/hooks/subscription.hook";
import { startTransition, useCallback, useRef, useState } from "react";
import UserApi from "@/api/user.api";
import { User } from "@/types/user";
import Controls from "./components/controls.tabletop";

const cellApi = new CellApi();
const userApi = new UserApi();

export default function Tabletop() {
  const queryClient = useQueryClient();

  const [constrol, setControl] = useState<boolean>(false);

  const initialMount = useRef<boolean>(true);

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

  if (isLoading) return <WindowLoader />;
  if (isError)
    return (
      <WindowError
        error={new Error("Ошибка загрузки данных")}
        icon={<CircleX className="animate-pulse size-28 text-red-500" />}
        refresh={refetch}
        button
      />
    );

  return (
    <main className="relative flex w-full h-full items-center justify-center overflow-clip bg-background">
      {/* CONTROLS */}
      {constrol ? (
        <Controls setControls={setControl} />
      ) : (
        <button
          className="absolute left-2 top-2 text-muted hover:text-text cursor-pointer border rounded p-1 z-500"
          title="Меню"
          onClick={() => setControl(true)}
        >
          <Menu />
        </button>
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
          />
        </TransformComponent>
      </TransformWrapper>
    </main>
  );
}
