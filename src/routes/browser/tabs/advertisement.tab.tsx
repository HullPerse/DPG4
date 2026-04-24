import { memo, startTransition, useCallback, useState } from "react";
import AdsApi from "@/api/ads.api";
import { Ads } from "@/types/ads.d";
import { useUserStore } from "@/store/user.store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSubscription } from "@/hooks/subscription.hook";
import {
  SmallLoader,
  WindowLoader,
} from "@/components/shared/loader.component";
import { WindowError } from "@/components/shared/error.component";
import { NetworkIcon, Plus, Image as ImageIcon, Trash } from "lucide-react";
import { Button } from "@/components/ui/button.component";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog.component";
import { Input } from "@/components/ui/input.component";
import { ImageUploader } from "@/components/shared/uploader.component";
import ImageComponent from "@/components/shared/image.component";
import { image } from "@/api/client.api";

const adsApi = new AdsApi();

function AdTab() {
  const queryClient = useQueryClient();
  const user = useUserStore((state) => state.user);

  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [text, setText] = useState<string>("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["adsTab"],
    queryFn: async (): Promise<Ads[]> => {
      const data = await adsApi.getAds();
      return data.filter((i) => i.owner.id === user?.id);
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

  const handleRemove = async (id: string) => {
    setLoading(true);

    await adsApi.removeAd(id);

    setLoading(false);
  };

  const handleSubmit = async () => {
    setLoading(true);

    const adData = {
      owner: {
        username: user?.username,
        id: user?.id,
      },
      image: imageFile,
      text: text,
    } as Ads;

    await adsApi.createAd(adData);

    setIsOpen(false);
    setLoading(false);
  };

  return (
    <main className="flex flex-col gap-2 w-full h-full pt-2">
      <Button
        variant="ghost"
        className="w-full h-18 border-2 border-highlight-high flex flex-row items-center justify-start"
        onClick={() => setIsOpen(true)}
      >
        <Plus className="size-10" />
        <div className="flex flex-col w-full items-start overflow-hidden">
          <span className="ml-2 font-bold text-xl">Создать рекламу</span>
          <span className="ml-2 text-sm font-light text-muted truncate line-clamp-1">
            Создайте новую рекламу
          </span>
        </div>
      </Button>

      <section className="flex flex-col w-full overflow-y-auto gap-2">
        {data?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted">
            <ImageIcon className="size-12 mb-2 opacity-50" />
            <span>Реклама отсутствует</span>
          </div>
        ) : (
          data?.map((item) => (
            <div
              key={item.id}
              className="w-full h-18 border-2 border-highlight-high flex flex-row items-center justify-start"
            >
              {item.image && (
                <ImageComponent
                  src={`${image.ads}${item.id}/${item.image}`}
                  alt="ad image"
                  className="h-16 w-16 min-w-16 min-h-16 border-2 border-highlight-high ml-1"
                />
              )}
              <span className="ml-2 truncate line-clamp-2">{item.text}</span>

              <Button
                variant="error"
                size="icon"
                className="ml-auto mr-2 size-13"
                onClick={() => handleRemove(String(item.id))}
              >
                {loading ? <SmallLoader /> : <Trash />}
              </Button>
            </div>
          ))
        )}
      </section>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Создать рекламу</DialogTitle>
            <DialogDescription>
              Загрузите изображение и добавьте текст рекламы
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <ImageUploader
              value={imageFile}
              onChange={setImageFile}
              className="w-full"
            />

            <Input
              placeholder="Текст рекламы..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={200}
            />
          </div>

          <DialogFooter className="bg-card">
            <Button
              variant="error"
              onClick={() => setIsOpen(false)}
              disabled={loading}
            >
              {loading ? <SmallLoader /> : "ОТМЕНИТЬ"}
            </Button>
            <Button
              variant="success"
              onClick={handleSubmit}
              disabled={!text || !imageFile}
            >
              {loading ? <SmallLoader /> : "СОЗДАТЬ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

export default memo(AdTab);
