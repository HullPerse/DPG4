import { image } from "@/api/client.api";
import ItemsApi from "@/api/items.api";
import { WindowError } from "@/components/shared/error.component";
import ImageComponent from "@/components/shared/image.component";
import {
  SmallLoader,
  WindowLoader,
} from "@/components/shared/loader.component";
import { Button } from "@/components/ui/button.component";
import { Input } from "@/components/ui/input.component";
import { useSubscription } from "@/hooks/subscription.hook";
import { highlightText } from "@/lib/utils";
import { useUserStore } from "@/store/user.store";
import { Market } from "@/types/items";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { setDate } from "date-fns";
import { Check, NetworkIcon, Trash } from "lucide-react";
import { memo, startTransition, useCallback, useState } from "react";

const itemsApi = new ItemsApi();

function MarketBrowser({ searchTerms }: { searchTerms: string }) {
  const queryClient = useQueryClient();
  const user = useUserStore((state) => state.user);

  let initialLoad = false;

  const [loading, setLoading] = useState<number>(-1);
  const [active, setActive] = useState<number>(-1);
  const [inputDiscount, setInputDiscount] = useState<string>("");

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

  const handleDiscount = async (
    index: number,
    marketId: string,
    discountPrice: number,
  ) => {
    setLoading(index);
    await itemsApi.discountMarket(marketId, discountPrice).then(() => {
      setLoading(-1);
      invalidateQuery();
      setInputDiscount("");
    });
  };

  return (
    <main className="relative flex flex-wrap justify-start gap-2 overflow-y-auto w-full pb-5 p-2 pt-10">
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

                <section className="mt-auto w-full flex flex-col gap-1">
                  {item.owner.id === user?.id && (
                    <div className="flex flex-row gap-1 w-full">
                      <Input
                        type="text"
                        value={inputDiscount}
                        onChange={(e) => setInputDiscount(e.target.value)}
                        placeholder="Скидочная цена"
                        min={0}
                        className="flex-1 h-9"
                      />
                      <Button
                        variant="success"
                        size="icon"
                        className="w-9 h-9"
                        onClick={() =>
                          handleDiscount(
                            index,
                            String(item.id),
                            Number(inputDiscount),
                          )
                        }
                        disabled={
                          !inputDiscount || Number(inputDiscount) === item.price
                        }
                      >
                        {loading === index ? <SmallLoader /> : <Check />}
                      </Button>
                    </div>
                  )}
                  <Button
                    variant="success"
                    className="w-full"
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
                </section>
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
                <div className="flex flex-row w-full gap-1 mt-auto">
                  <Button
                    variant="success"
                    className="flex-1"
                    disabled={Number(user?.money) < item.price}
                  >
                    {loading === index ? (
                      <SmallLoader />
                    ) : item.discount ? (
                      <div className="relative flex flex-row items-center justify-center gap-1">
                        <span className="absolute -top-2 -right-7 text-xs font-light">
                          {Math.floor((item.discount * 100) / item.price)}%
                        </span>
                        <span>КУПИТЬ ЗА</span>
                        <div className="flex flex-row gap-1 items-end justify-center">
                          <span className="font-bold">{item.discount}</span>
                          <span className="line-through text-xs font-light">
                            {item.price}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-row items-center justify-center gap-1">
                        <span>КУПИТЬ ЗА</span>
                        <div className="flex flex-row gap-1 items-end justify-center">
                          <span className="font-bold">{item.price}</span>
                        </div>
                      </div>
                    )}
                  </Button>
                  {item.owner.id === user?.id && (
                    <Button
                      variant="error"
                      size="icon"
                      className="w-9 h-9"
                      disabled={loading === index}
                    >
                      <Trash />
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
    </main>
  );
}

export default memo(MarketBrowser);
