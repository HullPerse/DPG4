import CellApi from "@/api/cell.api";
import { WindowError } from "@/components/shared/error.component";
import { WindowLoader } from "@/components/shared/loader.component";
import { cellsConfig } from "@/config/cells.config";
import useLoading from "@/hooks/loader.hook";
import { translateCell } from "@/lib/cell.utils";
import { useUserStore } from "@/store/user.store";
import { Cell } from "@/types/cell";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleAlert, CircleQuestionMark, X } from "lucide-react";

const cellApi = new CellApi();

export default function Controls({
  setControls,
  cell,
  setCell,
}: {
  setControls: (value: boolean) => void;
  cell: number | null;
  setCell: (value: number | null) => void;
}) {
  const queryClient = useQueryClient();
  const user = useUserStore((state) => state.user);

  const { data, isLoading, isError, refetch, isRefetching, isRefetchError } =
    useQuery<{
      cell: Cell;
    }>({
      queryKey: ["cellCard", cell],
      queryFn: async () => {
        return {
          cell: (await cellApi.getCellById(String(cell))) as unknown as Cell,
        };
      },
      enabled: !!cell,
    });

  const getComponent = () => {
    const actionMap = {
      MOVE: {
        component: "Кинуть кубик",
      },
      GAMEADD: {
        component: "Добавить игру",
      },
      GAMEFINISH: {
        component: "Изменить статус игры",
      },
    };

    return actionMap[user?.currentAction as keyof typeof actionMap];
  };

  const minLoading = useLoading(isLoading || isRefetching, 300);

  if (minLoading)
    return (
      <section
        className="absolute bottom-2 left-2 w-120 bg-card rounded border-2 border-highlight-high z-50 transition-all duration-300 ease-in-out "
        style={{
          height: "10rem",
        }}
      >
        <WindowLoader className="pb-0" />
      </section>
    );
  if (isError || isRefetchError)
    return (
      <section
        className="absolute bottom-2 left-2 w-120 bg-card rounded border-2 border-highlight-high z-50 transition-all duration-300 ease-in-out"
        style={{
          height: "10rem",
        }}
      >
        <WindowError
          error={new Error("Ошибка загрузки данных")}
          icon={<CircleAlert />}
          refresh={refetch}
          button
        />
      </section>
    );

  const cellId = () => {
    if (!cell) return "Действия";
    if (["start", "finish"].includes(String(data?.cell.type)))
      return translateCell(String(data?.cell.type));
    return `Клетка: ${data?.cell.number}`;
  };

  return (
    <section className="absolute bottom-2 left-2 w-120 max-w-[96%] bg-card rounded border-2 border-highlight-high z-50 transition-all duration-300 ease-in-out">
      <div className="flex flex-row w-full items-center jusitfy-between px-2 py-1 border-b-2 border-highlight-high">
        <span className="w-full font-bold">{cellId()}</span>
        <X
          className="text-muted hover:text-text hover:cursor-pointer w-4 h-4"
          onClick={() => {
            queryClient.removeQueries({ queryKey: ["cellCard"] });
            setCell(null);
            setControls(false);
          }}
        />
      </div>

      <section className="flex flex-col w-full h-full p-2 bg-background">
        {Object.entries(data?.cell.conditions ?? {}).map(([key, value]) => {
          if (!value) return;

          return (
            <div
              key={key}
              className="flex justify-between items-start gap-3 min-w-0"
            >
              <span className="font-mono text-md shrink-0">{key}:</span>
              <span
                className="font-mono text-md text-muted text-right wrap-break-word min-w-0 flex-1"
                style={{ whiteSpace: "pre-line" }}
              >
                {value.replace(/\\n/g, "\n")}
              </span>
            </div>
          );
        })}
        <div className="w-full bg-highlight-high h-0.5 my-1" />
        {(() => {
          const statusCounts = data?.cell?.status?.reduce(
            (acc: { [key: string]: number }, status: string) => {
              acc[status] = (acc[status] || 0) + 1;
              return acc;
            },
            {},
          );

          return Object.entries(statusCounts ?? {}).map(([status, count]) => {
            const statusData =
              cellsConfig.status.find((item) => item.name === status) ?? null;

            return (
              <div
                key={status}
                className="flex flex-row justify-between items-start gap-1 min-w-0"
              >
                <div className="flex flex-row items-center gap-1 w-18">
                  <div className="w-6">
                    {statusData?.icon ?? <CircleQuestionMark />}
                  </div>
                  <span className="text-text text-xs">x{count}</span>
                </div>
                <span className="font-mono text-md text-muted text-right wrap-break-word min-w-0 flex-1">
                  {statusData?.description ?? "Неизвестно"}
                </span>
              </div>
            );
          });
        })()}

        {!cell && getComponent().component}
      </section>
    </section>
  );
}
