import CellApi from "@/api/cell.api";
import { WindowError } from "@/components/shared/error.component";
import { WindowLoader } from "@/components/shared/loader.component";
import useLoading from "@/hooks/loader.hook";
import { useUserStore } from "@/store/user.store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleAlert, X } from "lucide-react";

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
    useQuery({
      queryKey: ["cellCard"],
      queryFn: async () => {
        if (!cell) return;

        return {
          cell: await cellApi.getCellById(String(cell)),
        };
      },
      enabled: !!cell,
    });

  const getComponent = () => {
    if (data?.cell)
      return {
        component: <>Cell Data</>,
      };

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

  const minLoading = useLoading(isLoading || isRefetching, 3000);

  if (minLoading)
    return (
      <section
        className="absolute top-2 w-[97%] bg-card rounded border-2 border-highlight-high z-50 transition-all duration-300 ease-in-out "
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
        className="absolute top-2 w-[97%] bg-card rounded border-2 border-highlight-high z-50 transition-all duration-300 ease-in-out"
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

  return (
    <section
      className="absolute top-2 w-[97%] bg-card rounded border-2 border-highlight-high z-50 transition-all duration-300 ease-in-out"
      style={{
        height: "10rem",
      }}
    >
      <X
        className="absolute top-1 right-1 text-muted hover:text-text hover:cursor-pointer w-4 h-4"
        onClick={() => {
          queryClient.removeQueries({ queryKey: ["cellCard"] });
          setCell(null);
          setControls(false);
        }}
      />

      <section className="flex flex-row w-full h-full items-center p-2">
        {getComponent().component}
      </section>
    </section>
  );
}
