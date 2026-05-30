import { Ads } from "@/types/ads";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  startTransition,
  useCallback,
  useRef,
  useEffect,
  useMemo,
  useState,
} from "react";
import AdsApi, {
  SUBSCRIPTION_CONTINUE,
  SUBSCRIPTION_COST,
} from "@/api/ads.api";
import { useSubscription } from "@/hooks/subscription.hook";
import { X, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button.component";
import ImageComponent from "@/components/shared/image.component";
import { getFileUrl } from "@/api/client.api";
import { cn, getAdPosition, getAdPositionIcon } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.component";
import { useUserStore } from "@/store/user.store";
import { useDataStore } from "@/store/data.store";
import ImageViewer from "@/components/shared/viewer.component";

const adsApi = new AdsApi();
const CLOSE_TIME = 10;

function AdvertisementApp() {
  const queryClient = useQueryClient();
  const user = useUserStore((state) => state.user);
  const adPosition = useDataStore((state) => state.adPosition);
  const setAdPosition = useDataStore((state) => state.setAdPosition);

  const { data } = useQuery({
    queryKey: ["annoyingAds"],
    queryFn: async (): Promise<Ads[]> => await adsApi.getAds(),
  });

  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [canClose, setCanClose] = useState<boolean>(false);
  const [remaining, setRemaining] = useState<number>(CLOSE_TIME);

  const [confirm, setConfirm] = useState<boolean>(false);
  const [open, setOpen] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const invalidateQuery = useCallback(() => {
    startTransition(() => {
      queryClient.invalidateQueries({
        queryKey: ["annoyingAds"],
        refetchType: "active",
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

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const randomAd = useMemo(() => {
    if (!data?.length) return null;
    return data[Math.floor(Math.random() * data.length)];
  }, [data]);

  useEffect(() => {
    if (randomAd?.audio && audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  }, [randomAd]);

  const progress = ((CLOSE_TIME - remaining) / CLOSE_TIME) * 100;

  if (!isVisible || !randomAd || !data || data.length === 0) return null;

  return (
    <main
      className={`absolute ${getAdPosition(adPosition)} z-1000 flex w-72 flex-col border-2 border-highlight-high bg-card shadow-sharp-sm transition-all duration-300`}
    >
      <section className="flex flex-row items-center justify-between border-b-2 border-highlight-high px-2 py-1">
        <div className="flex flex-row gap-1 items-center">
          <Button
            size="icon"
            variant="link"
            className="h-4 w-4 px-1 p-2 transition-all duration-200"
            onClick={() => {
              if (adPosition === 4) return setAdPosition(1);
              else return setAdPosition((adPosition + 1) as typeof adPosition);
            }}
          >
            {getAdPositionIcon(adPosition)}
          </Button>
          <span>Реклама</span>
        </div>

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
              <span className="pointer-events-none">Точно?</span>
            )}
          </Button>
        </div>
      </section>

      <section className="relative flex flex-col items-center p-2">
        {randomAd?.audio && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3 h-7 min-w-7 w-fit px-1 transition-all duration-200 z-50"
            onClick={(e) => {
              e.stopPropagation();
              toggleMute();
            }}
          >
            {isMuted ? (
              <VolumeX className="size-4" />
            ) : (
              <Volume2 className="size-4" />
            )}
          </Button>
        )}
        <ImageViewer
          src={[`${getFileUrl(randomAd)}`]}
          zoomable
          draggable
          trigger={
            <ImageComponent
              src={`${getFileUrl(randomAd)}`}
              alt={randomAd.text}
              className="min-h-42 h-42 max-h-42 border border-highlight-high hover:cursor-pointer z-49"
              type="contain"
            />
          }
        />

        {randomAd.audio && (
          <audio
            ref={audioRef}
            src={`${getFileUrl(randomAd, "audio")}`}
            className="hidden"
          />
        )}

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
              продливается после каждого прохождния игры за половину стоимости
              подписки ({SUBSCRIPTION_CONTINUE}). !ПОДПИСКУ НЕЛЬЗЯ БУДЕТ
              ОТМЕНИТЬ САМОСТОЯТЕЛЬНО (для этого необходимо обратиться в
              поддержку ЛИБО не иметь средств для продления подписки, в связи с
              чем она будет отменена автоматически)!
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

export default AdvertisementApp;
