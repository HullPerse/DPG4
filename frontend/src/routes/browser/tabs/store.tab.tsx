import ActivityApi from "@/api/activity.api";
import { getFileUrl } from "@/api/client.api";
import ItemsApi from "@/api/items.api";
import UserApi from "@/api/user.api";
import ImageComponent from "@/components/shared/image.component";
import { SmallLoader } from "@/components/shared/loader.component";
import { Button } from "@/components/ui/button.component";
import { weightedRandom } from "@/lib/utils";
import { useDataStore } from "@/store/data.store";
import { useUserStore } from "@/store/user.store";
import { Activity } from "@/types/activity";
import type { Item } from "@/types/items";
import type { StoreItem } from "@/types/store";
import { useState } from "react";

const itemsApi = new ItemsApi();
const userApi = new UserApi();
const activityApi = new ActivityApi();

const ITEMS_AMOUNT = 6;

function StoreTab() {
  const user = useUserStore((state) => state.user);
  const storeItems = useDataStore((state) => state.storeItems);
  const rerollPrice = useDataStore((state) => state.rerollPrice);
  const setStoreItems = useDataStore((state) => state.setStoreItems);
  const setRerollPrice = useDataStore((state) => state.setRerollPrice);

  const [active, setActive] = useState<number>(-1);
  const [loading, setLoading] = useState(false);

  const markBought = (index: number) => {
    setStoreItems(
      storeItems.map((entry, i) =>
        i === index ? { ...entry, bought: true } : entry,
      ),
    );
  };

  const handleReroll = async () => {
    const userMoney = await userApi.getUserScore(String(user?.id));

    if (userMoney < rerollPrice) return;

    setLoading(true);
    try {
      await userApi.scoreUser(String(user?.id), -rerollPrice);

      const randomSixItems = await itemsApi.getItems({ random: ITEMS_AMOUNT });

      const finalArray: StoreItem[] = [];

      for (const item of randomSixItems) {
        const price = weightedRandom(15);
        finalArray.push({ item, price, bought: false });
      }

      setStoreItems(finalArray);
      setRerollPrice(rerollPrice + 1);
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async (item: Item, price: number) => {
    const userMoney = await userApi.getUserScore(String(user?.id));

    if (userMoney < price) return;

    await itemsApi.addInventory(String(user?.id), String(item.id));
    await userApi.scoreUser(String(user?.id), -price);

    const activityData = {
      author: user?.id,
      image: user?.avatar,
      text: `${user?.username} купил ${item.label} за ${price}`,
    } as Activity;

    await activityApi.createActivity(activityData);
  };

  return (
    <main className="flex flex-wrap w-full gap-1 p-2">
      <Button
        title={`Чубриков:  ${String(user?.money)}`}
        variant="info"
        className="w-full h-10"
        onClick={handleReroll}
        disabled={loading || (user?.money ?? 0) < rerollPrice}
      >
        {loading ? <SmallLoader /> : `РЕРОЛЛ за ${rerollPrice}`}
      </Button>

      {storeItems.length === 0 && (
        <div className="flex w-full h-64 items-center justify-center text-text/40 text-lg font-bold">
          В магазине пока нет товаров
        </div>
      )}

      {storeItems.map((entry, index) => {
        const isBought = entry.bought ?? false;

        return (
          <div
            key={entry.item.id ?? index}
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
                  {entry.item.description}
                </span>
              ) : (
                <>
                  <span className="font-bold text-md line-clamp-2">
                    {entry.item.label}
                  </span>

                  <ImageComponent
                    src={`${getFileUrl(entry.item)}`}
                    alt={entry.item.label}
                    className="min-w-24 w-24 min-h-24 h-24 border border-highlight-high"
                    type="cover"
                  />

                  <div className="flex flex-row gap-0.5 w-full h-6 items-center justify-center my-1">
                    <span className="w-24 h-6 bg-card text-primary font-bold border border-highlight-high text-center">
                      {entry.item.charge}
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
                onClick={async () => {
                  await handleBuy(entry.item, entry.price);
                  markBought(index);
                }}
                disabled={(user?.money ?? 0) < entry.price}
              >
                КУПИТЬ за {entry.price}
              </Button>
            )}
          </div>
        );
      })}
    </main>
  );
}

export default StoreTab;
