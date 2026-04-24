import { Ads } from "@/types/ads";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  memo,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import AdsApi, { SUBSCRIPTION_COST } from "@/api/ads.api";
import { useSubscription } from "@/hooks/subscription.hook";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button.component";
import ImageComponent from "@/components/shared/image.component";
import { image } from "@/api/client.api";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.component";
import { useUserStore } from "@/store/user.store";

const adsApi = new AdsApi();
const CLOSE_TIME = 10;

function AdvertisementApp() {
  const queryClient = useQueryClient();
  const user = useUserStore((state) => state.user);

  const { data } = useQuery({
    queryKey: ["annoyingAds"],
    queryFn: async (): Promise<Ads[]> => await adsApi.getAds(),
  });

  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [canClose, setCanClose] = useState<boolean>(false);
  const [remaining, setRemaining] = useState<number>(CLOSE_TIME);

  const [confirm, setConfirm] = useState<boolean>(false);
  const [open, setOpen] = useState<boolean>(false);

  const invalidateQuery = useCallback(() => {
    startTransition(() => {
      queryClient.invalidateQueries({
        queryKey: ["annoyingAds"],
        refetchType: "all",
      });
    });
  }, [queryClient]);

  useSubscription("ads", "*", invalidateQuery);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          setCanClose(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const randomAd = useMemo(() => {
    if (!data?.length) return null;
    return data[Math.floor(Math.random() * data.length)];
  }, [data]);

  const progress = ((CLOSE_TIME - remaining) / CLOSE_TIME) * 100;

  if (!isVisible || !randomAd || !data || data.length === 0) return null;

  return (
    <main className="absolute top-2 right-2 z-1000 flex w-72 flex-col border-2 border-highlight-high bg-card shadow-sharp-sm transition-all duration-300">
      <section className="flex flex-row items-center justify-between border-b-2 border-highlight-high px-2 py-1">
        <span>Реклама</span>

        <div className="flex flex-row px-1 gap-1 items-center">
          <Button
            variant="success"
            className="h-7 min-w-7 w-fit px-1 transition-all duration-200"
            onClick={() => setOpen(true)}
          >
            подписка
          </Button>

          <Button
            variant="error"
            size="icon"
            className="h-7 min-w-7 w-fit px-1 transition-all duration-200"
            onClick={() => {
              if (!confirm) return setConfirm(true);

              return setIsVisible(false);
            }}
            disabled={!canClose}
          >
            {!confirm ? (
              <X className="size-4" />
            ) : (
              <span className="pointer-events-none">Вы уверены?</span>
            )}
          </Button>
        </div>
      </section>

      <section className="flex flex-col items-center p-2">
        <ImageComponent
          src={`${image.ads}${randomAd.id}/${randomAd.image}`}
          alt={randomAd.text}
          className="min-h-42 h-42 max-h-42 border border-highlight-high"
          type="contain"
        />

        <span className="mt-2 line-clamp-2 text-center text-xs text-text">
          {randomAd.text}
        </span>
        <span className="mt-1 text-[10px] text-muted">
          от {randomAd.owner.username}
        </span>
      </section>

      <section className="flex flex-col border-t-2 border-highlight-high">
        <div className="relative h-1 w-full bg-background">
          <div
            className={cn(
              "absolute h-full bg-iris transition-all duration-1000",
              canClose ? "bg-primary" : "",
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-center px-2 py-1">
          <span
            className={cn(
              "text-xs font-bold",
              canClose ? "text-primary" : "text-muted",
            )}
          >
            {!canClose && `${remaining}с`}
          </span>
        </div>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex flex-col sm:max-w-md gap-2">
          <DialogHeader>
            <DialogTitle>Купить подписку</DialogTitle>
            <DialogDescription>
              Купите подписку за {SUBSCRIPTION_COST} чубрика. Подписка
              оплачивается после каждого прохождния игры. !ПОДПИСКУ НЕЛЬЗЯ БУДЕТ
              ОТМЕНИТЬ САМОСТОЯТЕЛЬНО (для этого необходимо обратиться в
              поддержку)!
            </DialogDescription>
          </DialogHeader>

          <section className="mt-auto flex flex-row gap-2 w-full">
            <Button
              variant="error"
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              Отмена
            </Button>
            <Button
              variant="success"
              className="flex-1"
              onClick={async () => {
                if (!user?.money || user?.money < SUBSCRIPTION_COST) return;

                await adsApi
                  .subscribeAd(String(user?.id))
                  .then(() => setOpen(false));
              }}
              disabled={!user?.money || user?.money < SUBSCRIPTION_COST}
            >
              Купить
            </Button>
          </section>
        </DialogContent>
      </Dialog>
    </main>
  );
}

export default memo(AdvertisementApp);
