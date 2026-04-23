import { memo, startTransition, useCallback, useState } from "react";
import AdsApi from "@/api/ads.api";
import { Ads } from "@/types/ads";
import { useUserStore } from "@/store/user.store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSubscription } from "@/hooks/subscription.hook";
import { WindowLoader } from "@/components/shared/loader.component";
import { WindowError } from "@/components/shared/error.component";
import { NetworkIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button.component";

const adsApi = new AdsApi();

//Моя реклама
//Новая реклама ->
// 1. выбрать картинку
// 2. выбрать текст
// 3. оплата публикации + публикация
//
// 1. в главном меню рандомный попап рекламный с рекламой
// 2. закрыть можно только через 10 секунд (показать таймер)
//
function AdTab() {
  const queryClient = useQueryClient();
  const user = useUserStore((state) => state.user);

  const [loading, setLoading] = useState<boolean>(false);
  const [image, setImage] = useState<File | null>(null);
  const [text, setText] = useState<string>("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["adsTab"],
    queryFn: async (): Promise<Ads[]> => {
      return await adsApi.getAds();
    },
  });

  const invalidateQuery = useCallback(() => {
    startTransition(() => {
      queryClient.invalidateQueries({
        queryKey: ["adsTab"],
        refetchType: "all",
      });
    });
  }, [queryClient]);

  useSubscription("ads", "*", invalidateQuery);

  if (isLoading) return <WindowLoader />;
  if (isError)
    return (
      <WindowError
        error={new Error("Произошла ошибка")}
        icon={<NetworkIcon />}
        refresh={refetch}
        button
      />
    );

  const handleAdd = async () => {
    setLoading(true);

    const addData = {
      owner: {
        username: user?.username,
        id: user?.id,
      },
      image: image,
      text: text,
    } as Ads;

    await adsApi.createAd(addData);

    setLoading(false);
  };

  return (
    <main className="flex flex-col gap-2 w-full h-full pt-2">
      <Button
        variant="ghost"
        className="w-full h-18 border-2 border-highlight-high flex flex-row items-center justify-start"
        onClick={() => {}}
      >
        <Plus className="size-10" />
        <div className="flex flex-col w-full items-start overflow-hidden">
          <span className="ml-2 font-bold text-xl">Создать рекламу</span>
          <span className="ml-2 text-sm font-light text-muted truncate line-clamp-1">
            Создайте новую рекламу
          </span>
        </div>
      </Button>

      <section className="flex flex-col border-t-4 border-highlight-high w-full overflow-y-auto">
        {data?.map((item) => (
          <div>{item.text}</div>
        ))}
      </section>
    </main>
  );
}

export default memo(AdTab);
