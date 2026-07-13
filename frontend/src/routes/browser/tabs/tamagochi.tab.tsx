import { Canvas } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPet,
  feedPet,
  petPet,
  sleepPet,
  claimDailyReward,
  resurrectPet,
  searchDeadPet,
  setPetColor,
  setPetModel,
} from "@/api/pet.api";
import { fetchModelConfigs } from "@/api/config.api";
import { itemsApi } from "@/api/items.api";
import { useUserStore } from "@/store/user.store";
import { useSubscription } from "@/hooks/index.hook";
import { WindowLoader } from "@/components/shared/loader.component";
import { WindowError } from "@/components/shared/error.component";
import { Button } from "@/components/ui/button.component";
import {
  Apple,
  Hand,
  Bed,
  RotateCw,
  Search,
  FlaskConical,
  Volume2,
  BrickWall,
  Skull,
} from "lucide-react";
import type { Inventory } from "@/types/items";
import SceneContent from "../components/tamagochi/scene.tamagochi";
import StatBar from "../components/tamagochi/stat.tamagochi";
import { PALETTE, REWARD_THRESHOLD } from "@/config/tamagochi.config";
import { getMood } from "@/lib/index.utils";

const DEFAULT_MODEL = {
  id: "rat",
  label: "Крыса",
  url: "/models/rat.glb",
} as const;



async function preloadModel(url: string, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      useGLTF.preload(url);
      return;
    } catch {
      if (i === retries) throw new Error(`Failed to load model: ${url}`);
      await new Promise((r) => setTimeout(r, 1000 * 2 ** i));
    }
  }
}

preloadModel("/models/rat.glb").catch(() => {});
preloadModel("/models/dingus.glb").catch(() => {});

class SceneErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function TamagotchiTab() {
  const user = useUserStore((state) => state.user);
  const queryClient = useQueryClient();

  const [lastAction, setLastAction] = useState<string | null>(null);
  const [rewardMessage, setRewardMessage] = useState<string | null>(null);
  const [ratItems, setRatItems] = useState<Inventory[]>([]);
  const actionTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const wasEligibleRef = useRef(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["pet", user?.id],
    queryFn: () => getPet(user!.id),
    enabled: !!user?.id,
    staleTime: 30000,
  });

  const refetchPet = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["pet", user?.id] });
  }, [queryClient, user?.id]);

  useSubscription("pets", refetchPet);

  const petIsDead = data && !data.isAlive;
  const brodeforActive = ratItems.some((i) => i.label === "Бродефор");
  const hasKvas = ratItems.some((i) => i.label === "Квас");
  const hasKvaS = ratItems.some((i) => i.label === "КВАс");
  const hasKirpich = ratItems.some((i) => i.label === "Кирпич");

  useEffect(() => {
    if (!user?.id) return;
    itemsApi.getInventory(user.id).then((inv) => {
      setRatItems(inv.filter((i: Inventory) => i.type === "rat"));
    });
  }, [user?.id, rewardMessage]);

  useEffect(() => {
    if (!data || !user || petIsDead) {
      wasEligibleRef.current = false;
      return;
    }

    const isEligible =
      data.hunger > REWARD_THRESHOLD &&
      data.happiness > REWARD_THRESHOLD &&
      data.energy > REWARD_THRESHOLD;

    if (isEligible && !wasEligibleRef.current) {
      claimDailyReward(user.id).then((result) => {
        if (result.claimed) {
          if (result.reward === "money") {
            setRewardMessage(`Крыса принесла ${result.amount} монет!`);
          } else {
            setRewardMessage(`Крыса принесла предмет: ${result.itemLabel}!`);
          }
          setTimeout(() => setRewardMessage(null), 4000);
        }
      });
    }

    wasEligibleRef.current = isEligible;
  }, [data, user, petIsDead]);

  const handleAction = useCallback((action: "feed" | "pet" | "sleep") => {
    if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
    setLastAction(action);
    actionTimeoutRef.current = setTimeout(() => setLastAction(null), 1000);

    if (action === "feed") feedMutation.mutate();
    if (action === "pet") petMutation.mutate();
    if (action === "sleep") sleepMutation.mutate();
  }, []);

  const feedMutation = useMutation({
    mutationFn: () => feedPet(user!.id),
    onSuccess: () => refetchPet(),
  });

  const petMutation = useMutation({
    mutationFn: () => petPet(user!.id),
    onSuccess: () => refetchPet(),
  });

  const sleepMutation = useMutation({
    mutationFn: () => sleepPet(user!.id),
    onSuccess: () => refetchPet(),
  });

  const useItemMutation = useMutation({
    mutationFn: (inventoryId: string) => itemsApi.useInventory(inventoryId),
    onSuccess: () => {
      refetchPet();
      if (user?.id) {
        itemsApi.getInventory(user.id).then((inv) => {
          setRatItems(inv.filter((i: Inventory) => i.type === "rat"));
        });
      }
    },
  });

  const { data: modelConfigs = [] } = useQuery({
    queryKey: ["model-configs"],
    queryFn: fetchModelConfigs,
    staleTime: Infinity,
  });

  const colorMutation = useMutation({
    mutationFn: (color: string) => setPetColor(user!.id, color),
    onSuccess: () => refetchPet(),
  });

  const modelMutation = useMutation({
    mutationFn: (model: string) => setPetModel(user!.id, model),
    onSuccess: () => refetchPet(),
  });

  const currentModel = data?.model ?? "rat";
  const currentColor = data?.color ?? "#8B7355";
  const currentModelCfg = modelConfigs.find((m) => m.id === currentModel) ?? modelConfigs[0] ?? DEFAULT_MODEL;

  const resurrectMutation = useMutation({
    mutationFn: () => resurrectPet(user!.id),
    onSuccess: () => refetchPet(),
  });

  const searchMutation = useMutation({
    mutationFn: () => searchDeadPet(user!.id),
    onSuccess: (result) => {
      if (result.ok) {
        setRewardMessage(`Найден предмет: ${result.itemLabel}!`);
        setTimeout(() => setRewardMessage(null), 4000);
      }
    },
  });

  if (isLoading) return <WindowLoader />;
  if (isError) {
    return (
      <WindowError
        error={new Error("Не удалось загрузить питомца")}
        icon={<Bed className="size-28 animate-pulse text-red-500" />}
      />
    );
  }

  const mood = getMood(
    data?.hunger ?? 100,
    data?.happiness ?? 100,
    data?.energy ?? 100,
    data?.isAlive ?? true,
  );

  return (
    <main className="flex flex-col w-full h-full gap-3 p-2">
      <section className="relative flex-1 rounded-lg overflow-hidden border-2 border-highlight-high">
        <div className="absolute top-2 left-2 z-10">
          <span className="inline-flex items-center gap-1.5 bg-background/80 border border-highlight-med rounded-md px-2.5 py-1 text-sm font-medium">
            {petIsDead ? (
              <Skull className="size-4 text-red-400" />
            ) : (
              <span
                className="size-2 rounded-full"
                style={{
                  backgroundColor:
                    mood === "Счастлив"
                      ? "#50C878"
                      : mood === "Голоден" || mood === "Хочет спать" || mood === "Грустный"
                        ? "#f6c177"
                        : "#555",
                }}
              />
            )}
            {mood}
          </span>
        </div>

        {rewardMessage && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-green-900/90 border border-green-500 rounded-md px-4 py-2 z-30 animate-pulse text-sm font-bold text-green-300 whitespace-nowrap">
            {rewardMessage}
          </div>
        )}

        <SceneErrorBoundary
          fallback={
            <div className="flex h-full w-full flex-col items-center justify-center gap-3">
              <span className="text-sm text-muted">Ошибка загрузки модели</span>
              <Button
                variant="default"
                size="sm"
                onClick={() => window.location.reload()}
              >
                Перезагрузить
              </Button>
            </div>
          }
        >
          <Canvas className="h-full w-full" gl={{ antialias: true, alpha: true }}>
            <Suspense fallback={null}>
              <SceneContent
                reaction={lastAction}
                spinning={brodeforActive}
                isAlive={data?.isAlive ?? true}
                color={data?.color ?? "#8B7355"}
                modelCfg={currentModelCfg}
              />
            </Suspense>
          </Canvas>
        </SceneErrorBoundary>

        {petIsDead && <div className="absolute inset-0 bg-black/40 z-10 pointer-events-none" />}

        <div className="absolute bottom-0 left-0 right-0 z-10 bg-background/80 border-t border-highlight-med p-2.5 backdrop-blur-sm">
          <div className="flex flex-row gap-3">
            <StatBar label="Голод" value={data?.hunger ?? 100} color="#f6c177" dead={petIsDead} />
            <StatBar
              label="Счастье"
              value={data?.happiness ?? 100}
              color="#c4a7e7"
              dead={petIsDead}
            />
            <StatBar label="Энергия" value={data?.energy ?? 100} color="#9ccfd8" dead={petIsDead} />
          </div>
        </div>
      </section>

      {!petIsDead && (
        <section className="flex flex-row gap-2">
          <Button
            variant="default"
            disabled={feedMutation.isPending}
            onClick={() => handleAction("feed")}
            className="flex items-center gap-2 flex-1 h-11"
          >
            <Apple className="size-5" />
            Кормить
          </Button>
          <Button
            variant="default"
            disabled={petMutation.isPending}
            onClick={() => handleAction("pet")}
            className="flex items-center gap-2 flex-1 h-11"
          >
            <Hand className="size-5" />
            Гладить
          </Button>
          <Button
            variant="default"
            disabled={sleepMutation.isPending}
            onClick={() => handleAction("sleep")}
            className="flex items-center gap-2 flex-1 h-11"
          >
            <Bed className="size-5" />
            Спать
          </Button>
        </section>
      )}

      <section className="flex flex-col gap-2 p-3 bg-background border-2 border-highlight-high rounded-lg">
        <span className="text-xs text-muted font-semibold uppercase tracking-wider">Модель</span>
        <div className="flex flex-row flex-wrap gap-1.5">
          {modelConfigs.map((m) => (
            <Button
              key={m.id}
              disabled={modelMutation.isPending || m.id === data?.model}
              onClick={() => modelMutation.mutate(m.id)}
            >
              {m.label}
            </Button>
          ))}
        </div>
      </section>

      <section className="flex flex-row gap-3">
        <div className="flex flex-col gap-2 p-3 bg-background border-2 border-highlight-high rounded-lg flex-1">
          <span className="text-xs text-muted font-semibold uppercase tracking-wider">Цвет</span>
          <div className="flex flex-row flex-wrap gap-1.5">
            {PALETTE.map((color) => (
              <Button
                key={color}
                size="icon"
                disabled={colorMutation.isPending || color === data?.color}
                onClick={() => colorMutation.mutate(color)}
                className="group relative rounded-full border-2 border-highlight-med transition-transform hover:scale-110 active:scale-95 disabled:opacity-50"
                style={{ backgroundColor: color }}
                title={color}
              >
                {currentColor === color && (
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                    ✓
                  </span>
                )}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 p-3 bg-background border-2 border-highlight-high rounded-lg flex-1">
          <span className="text-xs text-muted font-semibold uppercase tracking-wider">
            Предметы
          </span>
          {petIsDead ? (
            <div className="flex flex-row gap-2">
              <Button
                variant="warning"
                className="flex items-center gap-2 flex-1"
                loading={resurrectMutation.isPending}
                disabled={resurrectMutation.isPending}
                onClick={() => resurrectMutation.mutate()}
              >
                <RotateCw className="size-4" />
                Воскресить
              </Button>
              <Button
                variant="default"
                className="flex items-center gap-2 flex-1"
                loading={searchMutation.isPending}
                disabled={searchMutation.isPending}
                onClick={() => searchMutation.mutate()}
              >
                <Search className="size-4" />
                Обыскать
              </Button>
            </div>
          ) : (
            <div className="flex flex-row flex-wrap gap-1.5">
              {hasKvas && (
                <Button
                  variant="default"
                  size="sm"
                  className="flex items-center gap-1.5"
                  loading={useItemMutation.isPending}
                  disabled={useItemMutation.isPending}
                  onClick={() => {
                    const inv = ratItems.find((i) => i.label === "Квас");
                    if (inv) useItemMutation.mutate(String(inv.id));
                  }}
                >
                  <FlaskConical className="size-4" />
                  Квас
                </Button>
              )}
              {hasKvaS && (
                <Button
                  variant="default"
                  size="sm"
                  className="flex items-center gap-1.5"
                  loading={useItemMutation.isPending}
                  disabled={useItemMutation.isPending}
                  onClick={() => {
                    const inv = ratItems.find((i) => i.label === "КВАс");
                    if (inv) {
                      useItemMutation.mutate(String(inv.id));
                      const audio = new Audio("/audio/frog.mp3");
                      audio.volume = 0.5;
                      audio.play().catch(() => {});
                    }
                  }}
                >
                  <Volume2 className="size-4" />
                  КВАс
                </Button>
              )}
              {hasKirpich && (
                <Button
                  variant="error"
                  size="sm"
                  className="flex items-center gap-1.5"
                  loading={useItemMutation.isPending}
                  disabled={useItemMutation.isPending}
                  onClick={() => {
                    const inv = ratItems.find((i) => i.label === "Кирпич");
                    if (inv) useItemMutation.mutate(String(inv.id));
                  }}
                >
                  <BrickWall className="size-4" />
                  Кирпич
                </Button>
              )}
              {brodeforActive && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm bg-foreground/5 text-muted border border-highlight-med">
                  <RotateCw className="size-4 animate-spin" />
                  Бродефор
                </span>
              )}
              {!hasKvas && !hasKvaS && !hasKirpich && !brodeforActive && (
                <span className="text-xs text-muted/50 px-1">Нет предметов</span>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default TamagotchiTab;
