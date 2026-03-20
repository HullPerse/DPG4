import CellApi from "@/api/cell.api";
import { WindowError } from "@/components/shared/error.component";
import { WindowLoader } from "@/components/shared/loader.component";
import { cellsConfig } from "@/config/cells.config";
import useLoading from "@/hooks/loader.hook";
import { translateCell } from "@/lib/cell.utils";
import { Cell } from "@/types/cell";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleAlert, CircleQuestionMark, X } from "lucide-react";
import { useMemo } from "react";
import MenuTabletop from "./menu.tabletop";

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

  const userHistory = useMemo(() => {
    if (!data || !data.cell.captured) return [];

    const result: Record<string, number> = {};

    for (const user of data.cell.captured) {
      result[user] = (result[user] || 0) + 1;
    }
    return result;
  }, [data]);

  const minLoading = useLoading(isLoading || isRefetching, 300);

  if (minLoading)
    return (
      <section
        className="absolute bottom-2 left-2 z-50 w-120 rounded border-2 border-highlight-high bg-card transition-all duration-300 ease-in-out"
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
        className="absolute bottom-2 left-2 z-50 w-120 rounded border-2 border-highlight-high bg-card transition-all duration-300 ease-in-out"
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
    <section className="absolute bottom-2 left-2 z-50 w-120 max-w-[96%] rounded border-2 border-highlight-high bg-card transition-all duration-300 ease-in-out">
      <div className="jusitfy-between flex w-full flex-row items-center border-b-2 border-highlight-high px-2 py-1">
        <span className="w-full font-bold">{cellId()}</span>
        <X
          className="h-4 w-4 text-muted hover:cursor-pointer hover:text-text"
          onClick={() => {
            queryClient.removeQueries({ queryKey: ["cellCard"] });
            setCell(null);
            setControls(false);
          }}
        />
      </div>

      {!cell ? (
        <MenuTabletop />
      ) : (
        <section className="flex h-full w-full flex-col bg-background p-2">
          {Object.entries(data?.cell.conditions ?? {}).map(([key, value]) => {
            if (!value) return;

            return (
              <div
                key={key}
                className="flex min-w-0 items-start justify-between gap-3"
              >
                <span className="text-md shrink-0 font-mono">{key}:</span>
                <span
                  className="text-md min-w-0 flex-1 text-right font-mono wrap-break-word text-muted"
                  style={{ whiteSpace: "pre-line" }}
                >
                  {value.replace(/\\n/g, "\n")}
                </span>
              </div>
            );
          })}
          <div className="my-1 h-0.5 w-full bg-highlight-high" />
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
                  className="flex min-w-0 flex-row items-start justify-between gap-1"
                >
                  <div className="flex w-18 flex-row items-center gap-1">
                    <div className="w-6">
                      {statusData?.icon ?? <CircleQuestionMark />}
                    </div>
                    <span className="text-xs text-text">x{count}</span>
                  </div>
                  <span className="text-md min-w-0 flex-1 text-right font-mono wrap-break-word text-muted">
                    {statusData?.description ?? "Неизвестно"}
                  </span>
                </div>
              );
            });
          })()}

          {userHistory.length > 0 && (
            <div>
              <span className="font-bold">Захват:</span>
              {Object.entries(userHistory).map(([user, count]) => (
                <div
                  key={user}
                  className="flex min-w-0 flex-row items-start justify-between gap-1"
                >
                  <span className="text-xs text-text">• {user}</span>
                  <span className="text-xs text-text">x{count}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </section>
  );
}
