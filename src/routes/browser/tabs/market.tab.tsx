import { image } from "@/api/client.api";
import ItemsApi from "@/api/items.api";
import { WindowError } from "@/components/shared/error.component";
import ImageComponent from "@/components/shared/image.component";
import {
  SmallLoader,
  WindowLoader,
} from "@/components/shared/loader.component";
import { Button } from "@/components/ui/button.component";
import { useSubscription } from "@/hooks/subscription.hook";
import { highlightText } from "@/lib/utils";
import { useUserStore } from "@/store/user.store";
import { Market } from "@/types/items";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NetworkIcon } from "lucide-react";
import { memo, startTransition, useCallback, useState } from "react";

const itemsApi = new ItemsApi();

function MarketBrowser({ searchTerms }: { searchTerms: string }) {
  const queryClient = useQueryClient();
  const user = useUserStore((state) => state.user);

  let initialLoad = false;

  const [loading, setLoading] = useState<number>(-1);
  const [active, setActive] = useState<number>(-1);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["marketTab"],
    queryFn: async (): Promise<Market[]> => {
      return await itemsApi.getMarket();
    },
  });
  const invalidateQuery = useCallback(() => {
    startTransition(() => {
      queryClient.invalidateQueries({
        queryKey: ["marketTab"],
        refetchType: "all",
      });
    });
  }, [queryClient]);

  useSubscription("market", "*", invalidateQuery);
  useSubscription("inventory", "*", invalidateQuery);

  if (isLoading && !initialLoad) return <WindowLoader />;
  if (isError)
    return (
      <WindowError
        error={new Error("Произошла ошибка")}
        icon={<NetworkIcon />}
        refresh={refetch}
        button
      />
    );

  initialLoad = false;

  const handleBuy = async (index: number, marketId: string, owner: string) => {
    setLoading(index);

    await itemsApi
      .buyMarket(marketId, String(user?.id), String(owner))
      .then(() => {
        setLoading(-1);
        invalidateQuery();
        queryClient.invalidateQueries({
          queryKey: ["inventoryTab", user?.id],
          refetchType: "all",
        });
      });
  };

  return (
    <main className="relative flex flex-wrap justify-start gap-2 overflow-y-auto w-full pb-15 p-2 pt-10">
      <span className="absolute top-1 left-2 font-bold border-2 border-highlight-high w-fit min-w-18 bg-background text-center">
        {user?.money} чубриков
      </span>
      {data
        ?.filter(
          (item) =>
            item.label.toUpperCase().includes(searchTerms.toUpperCase()) ||
            item.description
              .toUpperCase()
              .includes(searchTerms.toUpperCase()) ||
            item.owner.username
              .toUpperCase()
              .includes(searchTerms.toUpperCase()),
        )
        .map((item, index) => (
          <div
            key={item.id}
            className="flex flex-col min-w-64 min-h-64 w-64 h-64 overflow-hidden border-2 border-highlight-high shadow-sharp-sm bg-background items-center p-2"
            onMouseOver={() => setActive(index)}
            onMouseLeave={() => setActive(-1)}
          >
            {active === index ? (
              <span className="flex flex-col w-full h-full text-ellipsis text-sm">
                {highlightText(item.description, searchTerms)}

                <Button
                  variant="success"
                  className="w-full mt-auto"
                  onClick={() =>
                    handleBuy(index, String(item.id), String(item.owner))
                  }
                  disabled={Number(user?.money) < item.price}
                >
                  {loading === index ? (
                    <SmallLoader />
                  ) : (
                    `КУПИТЬ ЗА ${item.price}`
                  )}
                </Button>
              </span>
            ) : (
              <>
                <span className="font-bold text-md line-clamp-2">
                  {highlightText(item.label, searchTerms)}
                </span>

                <div className="flex flex-row gap-0.5 w-24 h-6 items-center justify-center my-1">
                  <span className="h-6 w-6 border border-highlight-high">
                    {item.owner.avatar}
                  </span>
                  <span className="flex-1 h-6 bg-card text-primary font-bold border border-highlight-high text-center px-0.5">
                    {highlightText(item.owner.username, searchTerms)}
                  </span>
                </div>

                <ImageComponent
                  src={`${image.market}${item.id}/${item.image}`}
                  alt={item.label}
                  className="min-w-24 w-24 min-h-24 h-24 border border-highlight-high"
                  type="contain"
                />

                <div className="flex flex-row gap-0.5 w-full h-6 items-center justify-center my-1">
                  <span className="w-24 h-6 bg-card text-primary font-bold border border-highlight-high text-center">
                    {item.charge}
                  </span>
                </div>

                <Button
                  variant="success"
                  className="w-full mt-auto"
                  disabled={Number(user?.money) < item.price}
                >
                  {loading === index ? (
                    <SmallLoader />
                  ) : (
                    `КУПИТЬ ЗА ${item.price}`
                  )}
                </Button>
              </>
            )}
          </div>
        ))}
    </main>
  );
}

export default memo(MarketBrowser);
