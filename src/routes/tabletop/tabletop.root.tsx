import CellApi from "@/api/cell.api";
import { WindowError } from "@/components/shared/error.component";
import { WindowLoader } from "@/components/shared/loader.component";
import { useQuery } from "@tanstack/react-query";
import { CircleX } from "lucide-react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import GameArea from "./components/game.tabletop";
import { Cell } from "@/types/cell";

const cellApi = new CellApi();

export default function Tabletop() {
  const { data, isLoading, isError, error, refetch } = useQuery<Cell[]>({
    queryKey: ["cells"],
    queryFn: async () => {
      return cellApi.getCells();
    },
  });

  if (isLoading) return <WindowLoader />;
  if (isError)
    return (
      <WindowError
        error={error}
        icon={<CircleX className="animate-pulse size-28 text-red-500" />}
        refresh={refetch}
        button
      />
    );

  return (
    <main className="flex w-full h-full items-center justify-center overflow-clip">
      {/* GAME AREA */}
      <TransformWrapper
        limitToBounds={false}
        initialScale={1}
        minScale={0.5}
        maxScale={5}
        centerOnInit={true}
        panning={{
          allowLeftClickPan: false,
          allowMiddleClickPan: false,
          allowRightClickPan: true,
        }}
        wheel={{ step: 0.1 }}
      >
        <TransformComponent
          contentStyle={{ width: "100%", height: "100%" }}
          wrapperStyle={{ width: "100%" }}
        >
          <GameArea data={data || []} />
        </TransformComponent>
      </TransformWrapper>
    </main>
  );
}
