import ActivityApi from "@/api/activity.api";
import { image } from "@/api/client.api";
import ItemsApi from "@/api/items.api";
import UserApi from "@/api/user.api";
import { WindowError } from "@/components/shared/error.component";
import ImageComponent from "@/components/shared/image.component";
import {
  SmallLoader,
  WindowLoader,
} from "@/components/shared/loader.component";
import { Button } from "@/components/ui/button.component";
import { shuffleArray, weightedRandom } from "@/lib/utils";
import { useUserStore } from "@/store/user.store";
import { Activity } from "@/types/activity";
import { Item } from "@/types/items";
import { useQuery } from "@tanstack/react-query";
import { CircleX } from "lucide-react";
import { useState } from "react";

const itemsApi = new ItemsApi();
const userApi = new UserApi();
const activityApi = new ActivityApi();

const INITIAL_PRICE = 2;
const ITEMS_AMOUNT = 6;

function StoreTab() {
  const user = useUserStore((state) => state.user);

  const [active, setActive] = useState<number>(-1);
  const [bought, setBought] = useState<Set<number>>(new Set());

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["randomStoreTab"],
    queryFn: async (): Promise<{ item: Item; price: number }[]> => {
      const allItems = await itemsApi.getAllItems();
      const randomSixItems = shuffleArray(allItems).slice(0, ITEMS_AMOUNT);

      let finalArray: { item: Item; price: number }[] = [];

      for (const item of randomSixItems) {
        const price = weightedRandom(15);
        finalArray.push({ item, price });
      }

      return finalArray;
    },

    enabled: false,
  });

  const handleBuy = async (item: Item, price: number) => {
    const userMoney = await userApi.getUserScore(String(user?.id));

    if (userMoney < price) return;

    //add item
    await itemsApi.addInventory(String(user?.id), String(item.id));
    //score user
    await userApi.scoreUser(String(user?.id), -price);

    const activityData = {
      author: user?.id,
      image: user?.avatar,
      text: `${user?.username} купил ${item.label} за ${price}`,
    } as Activity;

    await activityApi.createActivity(activityData);
  };

  const handleReroll = async () => {
    const userMoney = await userApi.getUserScore(String(user?.id));

    if (userMoney < INITIAL_PRICE) return;
    else {
      await userApi.scoreUser(String(user?.id), -INITIAL_PRICE);
      refetch();
    }
  };

  if (isLoading) return <WindowLoader />;
  if (isError)
    return (
      <WindowError
        error={new Error("Произошла ошибка при соединении с сервером")}
        icon={<CircleX className="size-28 animate-pulse text-red-500" />}
      />
    );

  return (
    <main className="flex flex-wrap w-full gap-1 p-2">
      <Button
        title={`Чубриков:  ${String(user?.money)}`}
        variant="info"
        className="w-full h-10"
        onClick={handleReroll}
        disabled={isRefetching || (user?.money ?? 0) < INITIAL_PRICE}
      >
        {isRefetching ? <SmallLoader /> : `РЕРОЛЛ за ${INITIAL_PRICE}`}
      </Button>

      {data?.map((item, index) => {
        const isBought = bought.has(index);

        return (
          <div
            key={index}
            className="relative flex flex-col min-w-64 min-h-64 w-64 h-64 overflow-hidden border-2 border-highlight-high shadow-sharp-sm bg-background items-center p-2"
          >
            <section
              className="flex flex-col items-center w-full flex-1"
              style={{ opacity: isBought ? 0.5 : 1 }}
              onMouseEnter={isBought ? undefined : () => setActive(index)}
              onMouseLeave={isBought ? undefined : () => setActive(-1)}
            >
              {!isBought && active === index ? (
                <span className="hover:overflow-y-auto text-xs leading-tight max-h-50">
                  {item.item.description}
                </span>
              ) : (
                <>
                  <span className="font-bold text-md line-clamp-2">
                    {item.item.label}
                  </span>

                  <ImageComponent
                    src={`${image.items}${item.item.id}/${item.item.image}`}
                    alt={item.item.label}
                    className="min-w-24 w-24 min-h-24 h-24 border border-highlight-high"
                    type="contain"
                  />

                  <div className="flex flex-row gap-0.5 w-full h-6 items-center justify-center my-1">
                    <span className="w-24 h-6 bg-card text-primary font-bold border border-highlight-high text-center">
                      {item.item.charge}
                    </span>
                  </div>
                </>
              )}
            </section>

            {isBought ? (
              <Button
                variant="ghost"
                disabled
                className="mt-auto w-full h-8 mb-1 opacity-50 border border-highlight-high"
              >
                КУПЛЕНО
              </Button>
            ) : (
              <Button
                variant="success"
                className="mt-auto w-full h-8 mb-1"
                onClick={() => {
                  handleBuy(item.item, item.price);
                  setBought((prev) => new Set(prev).add(index));
                }}
                disabled={(user?.money ?? 0) < item.price}
              >
                КУПИТЬ за {item.price}
              </Button>
            )}
          </div>
        );
      })}
    </main>
  );
}

export default StoreTab;
