import { Button } from "@/components/ui/button.component";
import { ChevronLeft, NetworkIcon } from "lucide-react";
import PaintApi from "@/api/paint.api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PaintType } from "@/types/paint";
import { WindowLoader } from "@/components/shared/loader.component";
import { WindowError } from "@/components/shared/error.component";
import ImagePaint from "../components/image.paint";
import { useSubscription } from "@/hooks/subscription.hook";
import { startTransition, useCallback } from "react";

const paintApi = new PaintApi();

function ListPaint({
  setTab,
}: {
  setTab: (value: "home" | "draw" | "list" | "profile") => void;
}) {
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["listPaint"],
    queryFn: async (): Promise<PaintType[]> => {
      const allData = await paintApi.getAllDrawings();
      return allData;
    },
  });

  const invalidateQuery = useCallback(() => {
    startTransition(() => {
      queryClient.invalidateQueries({
        queryKey: ["listPaint"],
        refetchType: "all",
      });
    });
  }, [queryClient]);

  useSubscription("drawings", "*", invalidateQuery);

  if (isLoading) return <WindowLoader />;
  if (isError)
    return (
      <WindowError
        error={new Error("Произошла ошибка при загрузке отзыва")}
        icon={<NetworkIcon />}
        className="relative"
      />
    );

  return (
    <main className="flex flex-row w-full h-full">
      <div className="flex flex-col w-45 border-r-2 border-highlight-high p-2">
        <section className="mt-auto flex flex-row gap-1">
          <Button
            variant="error"
            onClick={() => setTab("home")}
            className="w-full"
          >
            <ChevronLeft />
          </Button>
        </section>
      </div>

      <div className="flex flex-wrap gap-2 w-full h-fit overflow-y-auto p-2">
        {data?.map((item) => (
          <ImagePaint key={item.id} item={item} />
        ))}
      </div>
    </main>
  );
}

export default ListPaint;
