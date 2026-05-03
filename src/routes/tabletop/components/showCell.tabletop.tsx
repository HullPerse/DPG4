import CellApi from "@/api/cell.api";
import ItemsApi, { CELL_CONDITION_ITEMS } from "@/api/items.api";
import { WindowError } from "@/components/shared/error.component";
import { WindowLoader } from "@/components/shared/loader.component";
import { Button } from "@/components/ui/button.component";
import { useSubscription } from "@/hooks/subscription.hook";
import { useUserStore } from "@/store/user.store";
import { Cell } from "@/types/cell";
import { Inventory } from "@/types/items";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, CircleX, X } from "lucide-react";
import { startTransition, useCallback, useState } from "react";

const cellApi = new CellApi();
const itemsApi = new ItemsApi();

export default function ShowCell({
  setShowCell,
}: {
  setShowCell: (value: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const user = useUserStore((state) => state.user);

  const [currentItem, setCurrentItem] = useState<number>(0);
  const [tab, setTab] = useState<"Предмет" | "Клетка">("Предмет");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["showCell"],
    queryFn: async (): Promise<{
      cell: Cell;
      inventory: Inventory[];
    } | null> => {
      if (!user?.position) return null;
      const cellData = await cellApi.getCellByNumber(Number(user?.position));
      const inventoryData = await itemsApi
        .getInventory(String(user?.id))
        .then((res) =>
          res.filter((i) => CELL_CONDITION_ITEMS.includes(String(i.id))),
        );

      return {
        cell: cellData,
        inventory: inventoryData,
      };
    },
  });

  const invalidateQuery = useCallback(() => {
    startTransition(() => {
      queryClient.invalidateQueries({
        queryKey: ["showCell"],
        refetchType: "all",
      });
    });
  }, [queryClient]);

  useSubscription("inventory", "*", invalidateQuery);
  useSubscription("cells", "*", invalidateQuery);

  if (isLoading) return <WindowLoader />;
  if (isError)
    return (
      <WindowError
        error={new Error("Произошла ошибка при соединении с сервером")}
        icon={<CircleX className="size-28 animate-pulse text-red-500" />}
        refresh={refetch}
        button
      />
    );

  return (
    <main className="absolute bottom-2 left-2 z-50 w-120 max-w-[96%] rounded border-2 border-highlight-high bg-card transition-all duration-300 ease-in-out">
      <section className="jusitfy-between flex w-full flex-row items-center border-b-2 border-highlight-high px-2 py-1">
        <div className="flex flex-row gap-1 items-center">
          <Button
            variant="link"
            className="h-8 w-24 text-text hover:bg-text/20 disabled:bg-text/20 disabled:text-primary disabled:opacity-85 shadow-sharp-sm border"
            disabled={tab === "Предмет"}
            onClick={() => setTab("Предмет")}
          >
            Предмет
          </Button>
          <Button
            variant="link"
            className="h-8 w-24 text-text hover:bg-text/20 disabled:bg-text/20 disabled:text-primary disabled:opacity-85 shadow-sharp-sm border"
            disabled={tab === "Клетка"}
            onClick={() => {
              setTab("Клетка");
            }}
          >
            Клетка
          </Button>
        </div>
        <X
          className="ml-auto h-4 w-4 text-muted hover:cursor-pointer hover:text-text"
          onClick={() => {
            setShowCell(false);
          }}
        />
      </section>
      {tab === "Клетка" ? (
        <section className="flex h-full w-full flex-col bg-background p-2 gap-1">
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
        </section>
      ) : (
        <section className="flex h-full w-full flex-col bg-background p-2 gap-1">
          <div className="flex flex-row gap-1 border-b-2 border-highlight-high">
            <span className="truncate h-fit">
              [{currentItem + 1}/{data?.inventory.length}]{" "}
              {data?.inventory ? data?.inventory[currentItem].label : ""}
            </span>
            <div className="flex flex-row ml-auto items-center">
              <Button
                variant="ghost"
                size="icon"
                className="size-6 opacity-75 hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-30 mb-2"
                onClick={() => setCurrentItem((prev) => prev - 1)}
                disabled={currentItem === 0}
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 opacity-75 hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-30 mb-2"
                onClick={() => setCurrentItem((prev) => prev + 1)}
                disabled={currentItem === (data?.inventory.length ?? 1) - 1}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
          <span
            className="text-md min-w-0 flex-1 font-mono wrap-break-word text-muted"
            style={{ whiteSpace: "pre-line" }}
          >
            {data?.inventory[currentItem].description}
          </span>
        </section>
      )}
    </main>
  );
}
