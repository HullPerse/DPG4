import { memo, startTransition, useCallback, useState } from "react";

import ItemsApi from "@/api/items.api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUserStore } from "@/store/user.store";
import { Market } from "@/types/items";
import { useSubscription } from "@/hooks/subscription.hook";
import {
  SmallLoader,
  WindowLoader,
} from "@/components/shared/loader.component";
import { WindowError } from "@/components/shared/error.component";
import { Check, NetworkIcon, Trash } from "lucide-react";
import { Button } from "@/components/ui/button.component";
import { highlightText } from "@/lib/utils";
import ImageComponent from "@/components/shared/image.component";
import { image } from "@/api/client.api";
import { Input } from "@/components/ui/input.component";
const itemsApi = new ItemsApi();

function MarketBrowser({ searchTerms }: { searchTerms: string }) {
  const queryClient = useQueryClient();
  const user = useUserStore((state) => state.user);

  const [loading, setLoading] = useState<number>(-1);
  const [active, setActive] = useState<number>(-1);
  const [inputDiscount, setInputDiscount] = useState<string>("");

  let initialLoad = false;
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

    await itemsApi.buyMarket(marketId, String(user?.id), String(owner));

    queryClient.invalidateQueries({
      queryKey: ["inventoryTab", user?.id],
      refetchType: "all",
    });

    setLoading(-1);
  };

  const handleDiscount = async (
    index: number,
    marketId: string,
    owner: string,
    price: number,
    discount: number,
  ) => {
    setLoading(index);

    await itemsApi.discountMarket(marketId, owner, price, discount);

    setInputDiscount("");
    setLoading(-1);
  };

  const handleRemove = async (index: number, marketId: string) => {
    setLoading(index);

    await itemsApi.removeMarket(marketId);

    setLoading(-1);
  };

  return (
    <main className="relative flex flex-wrap w-full py-5 justify-start gap-2 overflow-y-auto">
      <span className="absolute top-1 right-1 font-bold border border-highlight-high w-fit min-w-18 bg-background text-center px-1">
        {user?.money} чубриков
      </span>

      {data
        ?.filter(
          (item) =>
            item.label.toUpperCase().includes(searchTerms.toUpperCase()) ||
            item.owner.username
              .toUpperCase()
              .includes(searchTerms.toUpperCase()),
        )
        .map((item, index) => (
          <div
            key={item.id}
            className="relative flex flex-col min-w-64 min-h-64 w-64 h-64 overflow-hidden border-2 border-highlight-high shadow-sharp-sm bg-background items-center p-2"
            onMouseOver={() => setActive(index)}
            onMouseLeave={() => setActive(-1)}
          >
            <section className="flex flex-col items-center justify-center">
              {active === index ? (
                <span className="flex flex-col w-full h-full text-ellipsis text-sm mt-8">
                  {highlightText(item.description, searchTerms)}
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
                </>
              )}
            </section>

            <section className="flex flex-col gap-1 mt-auto w-full pb-1">
              {/* DISCOUNT ITEM */}
              {active === index && item.owner.id === user?.id && (
                <div className="flex flex-row w-full gap-1">
                  <Input
                    placeholder="Скидочная цена"
                    max={item.price}
                    min={0}
                    value={inputDiscount}
                    onChange={(e) => setInputDiscount(e.target.value)}
                    className="h-9"
                    disabled={
                      loading === index || Number(inputDiscount) === item.price
                    }
                  />
                  <Button
                    variant="success"
                    size="icon"
                    className="w-9 h-9"
                    onClick={() =>
                      handleDiscount(
                        index,
                        String(item.id),
                        item.owner.id,
                        item.price,
                        Number(inputDiscount),
                      )
                    }
                    disabled={
                      loading === index ||
                      !inputDiscount ||
                      Number(inputDiscount) > item.price
                    }
                  >
                    <Check />
                  </Button>
                </div>
              )}
              <div className="flex flex-row w-full gap-1">
                {/* BUY ITEM */}
                <Button
                  variant="success"
                  className="flex-1"
                  onClick={() =>
                    handleBuy(index, String(item.id), String(item.owner.id))
                  }
                  disabled={Number(user?.money) < item.price}
                >
                  {loading === index ? (
                    <SmallLoader />
                  ) : (
                    <div className="flex flex-row items-center justify-center gap-1">
                      <span>КУПИТЬ ЗА</span>
                      <div className="flex flex-row gap-1 items-end justify-center">
                        <span className="font-bold">
                          {item.discount ? item.discount : item.price}
                        </span>
                        <span className="line-through text-xs font-light">
                          {item.discount! > 0 ? item.price : null}
                        </span>
                      </div>
                    </div>
                  )}
                </Button>
                {/* REMOVE ITEM */}
                <Button
                  rendered={item.owner.id === user?.id && active === index}
                  variant="error"
                  size="icon"
                  className="w-9 h-9"
                  onClick={() => handleRemove(index, String(item.id))}
                  disabled={loading === index}
                >
                  {loading === index ? <SmallLoader /> : <Trash />}
                </Button>
              </div>
            </section>
          </div>
        ))}
    </main>
  );
}

export default memo(MarketBrowser);
