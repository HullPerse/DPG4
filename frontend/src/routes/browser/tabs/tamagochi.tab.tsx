import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, OrbitControls, useGLTF } from "@react-three/drei";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
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
} from "@/api/pet.api";
import ItemsApi from "@/api/items.api";
import { useUserStore } from "@/store/user.store";
import { useSubscription } from "@/hooks/subscription.hook";
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

const itemsApi = new ItemsApi();
useGLTF.preload("/rat.glb");

const REWARD_THRESHOLD = 80;
const PALETTE = [
  "#8B7355",
  "#2D2D2D",
  "#FFFFFF",
  "#FF69B4",
  "#4A90D9",
  "#50C878",
  "#E74C3C",
  "#9B59B6",
  "#FF8C00",
  "#00BCD4",
  "#FFD700",
  "#A9A9A9",
];

function getMood(
  hunger: number,
  happiness: number,
  energy: number,
  isAlive: boolean,
): string {
  if (!isAlive) return "Мертва";
  if (hunger < 30) return "Голоден";
  if (energy < 30) return "Хочет спать";
  if (happiness < 30) return "Грустный";
  if (happiness > 70 && hunger > 70 && energy > 70) return "Счастлив";
  return "Нормально";
}

function RatModel({
  reaction,
  spinning,
  isAlive,
  color,
}: {
  reaction: string | null;
  spinning: boolean;
  isAlive: boolean;
  color: string;
}) {
  const { scene } = useGLTF("/rat.glb");
  const groupRef = useRef<THREE.Group>(null);
  const cloned = useMemo(() => {
    const c = scene.clone();
    c.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = child.material.clone();
      }
    });
    return c;
  }, [scene]);
  const animRef = useRef<{ type: string; elapsed: number } | null>(null);
  const prevReaction = useRef<string | null>(null);
  const deadColor = useRef(new THREE.Color(0x666666));
  const targetColor = useRef(new THREE.Color(color));

  useEffect(() => {
    targetColor.current.set(color);
  }, [color]);

  if (reaction && reaction !== prevReaction.current) {
    animRef.current = { type: reaction, elapsed: 0 };
    prevReaction.current = reaction;
  }

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    if (!isAlive) {
      groupRef.current.rotation.x = -Math.PI / 2.5;
      groupRef.current.rotation.z = 0.3;
      groupRef.current.rotation.y = 0;
      groupRef.current.scale.setScalar(1.15);
      groupRef.current.position.y = -1.0;
      cloned.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          (child.material as THREE.MeshStandardMaterial).color.lerp(
            deadColor.current,
            0.05,
          );
        }
      });
      return;
    }

    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        (child.material as THREE.MeshStandardMaterial).color.lerp(
          targetColor.current,
          0.08,
        );
      }
    });

    const anim = animRef.current;
    if (!anim) {
      if (spinning) {
        groupRef.current.rotation.y += delta * 1.5;
      } else {
        groupRef.current.rotation.y = 0;
      }
      groupRef.current.rotation.x = 0;
      groupRef.current.rotation.z = 0;
      groupRef.current.scale.setScalar(1.15);
      groupRef.current.position.y = -0.8;
      return;
    }

    anim.elapsed += delta;
    const progress = Math.min(anim.elapsed / 0.8, 1);

    if (anim.type === "feed") {
      const bounce =
        1 + Math.sin(progress * Math.PI * 3) * 0.12 * (1 - progress);
      groupRef.current.scale.setScalar(1.15 * bounce);
    } else if (anim.type === "pet") {
      groupRef.current.rotation.z =
        Math.sin(progress * Math.PI * 4) * 0.1 * (1 - progress);
    } else if (anim.type === "sleep") {
      groupRef.current.position.y = -0.8 - Math.sin(progress * Math.PI) * 0.3;
    }

    if (progress >= 1) {
      animRef.current = null;
    }
  });

  return (
    <group ref={groupRef} scale={1.15}>
      <primitive object={cloned} />
    </group>
  );
}

function SceneContent({
  reaction,
  spinning,
  isAlive,
  color,
}: {
  reaction: string | null;
  spinning: boolean;
  isAlive: boolean;
  color: string;
}) {
  return (
    <>
      <OrbitControls enablePan={true} />
      <Environment preset="city" />
      <color attach="background" args={["#232136"]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 6, 4]} intensity={1.6} color="#f6c177" />
      <directionalLight
        position={[-4, 3, -3]}
        intensity={0.6}
        color="#c4a7e7"
      />
      <directionalLight
        position={[-2, -1, 6]}
        intensity={0.4}
        color="#eb6f92"
      />
      <directionalLight
        position={[0, -4, -4]}
        intensity={0.25}
        color="#31748f"
      />
      <group position={[0, 0.3, 0]} rotation={[0, 0.6, 0]}>
        <Suspense fallback={null}>
          <RatModel
            reaction={reaction}
            spinning={spinning}
            isAlive={isAlive}
            color={color}
          />
        </Suspense>
      </group>
    </>
  );
}

function StatBar({
  label,
  value,
  color,
  dead,
}: {
  label: string;
  value: number;
  color: string;
  dead?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={`flex flex-col gap-0.5 flex-1 ${dead ? "opacity-40" : ""}`}>
      <div className="flex justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted">{Math.round(clamped)}</span>
      </div>
      <div className="h-1.5 w-full bg-highlight-high rounded-full overflow-hidden">
        <div
          className="h-full transition-all duration-500 ease-linear rounded-full"
          style={{
            width: `${clamped}%`,
            backgroundColor: dead ? "#555" : color,
          }}
        />
      </div>
    </div>
  );
}

function TamagotchiTab() {
  const user = useUserStore((state) => state.user);
  const queryClient = useQueryClient();

  const [lastAction, setLastAction] = useState<string | null>(null);
  const [rewardMessage, setRewardMessage] = useState<string | null>(null);
  const [ratItems, setRatItems] = useState<Inventory[]>([]);
  const rewardCheckedRef = useRef(false);
  const actionTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["pet", user?.id],
    queryFn: () => getPet(user!.id),
    enabled: !!user?.id,
    refetchOnMount: "always",
  });

  const refetchPet = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["pet", user?.id] });
  }, [queryClient, user?.id]);

  useSubscription("pets", "*", refetchPet);

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
    if (!data || !user || rewardCheckedRef.current || petIsDead) return;
    if (
      data.hunger > REWARD_THRESHOLD &&
      data.happiness > REWARD_THRESHOLD &&
      data.energy > REWARD_THRESHOLD
    ) {
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
    rewardCheckedRef.current = true;
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

  const colorMutation = useMutation({
    mutationFn: (color: string) => setPetColor(user!.id, color),
    onSuccess: () => refetchPet(),
  });

  const currentColor = data?.color ?? "#8B7355";

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
                      : mood === "Голоден" ||
                          mood === "Хочет спать" ||
                          mood === "Грустный"
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

        <Canvas
          camera={{ position: [3.5, 1, 1], fov: 48 }}
          className="h-full w-full"
          gl={{ antialias: true, alpha: true }}
        >
          <Suspense fallback={null}>
            <SceneContent
              reaction={lastAction}
              spinning={brodeforActive}
              isAlive={data?.isAlive ?? true}
              color={data?.color ?? "#8B7355"}
            />
          </Suspense>
        </Canvas>

        {petIsDead && (
          <div className="absolute inset-0 bg-black/40 z-10 pointer-events-none" />
        )}

        <div className="absolute bottom-0 left-0 right-0 z-10 bg-background/80 border-t border-highlight-med p-2.5 backdrop-blur-sm">
          <div className="flex flex-row gap-3">
            <StatBar
              label="Голод"
              value={data?.hunger ?? 100}
              color="#f6c177"
              dead={petIsDead}
            />
            <StatBar
              label="Счастье"
              value={data?.happiness ?? 100}
              color="#c4a7e7"
              dead={petIsDead}
            />
            <StatBar
              label="Энергия"
              value={data?.energy ?? 100}
              color="#9ccfd8"
              dead={petIsDead}
            />
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

      <section className="flex flex-row gap-3">
        <div className="flex flex-col gap-2 p-3 bg-background border-2 border-highlight-high rounded-lg flex-1">
          <span className="text-xs text-muted font-semibold uppercase tracking-wider">
            Окрас
          </span>
          <div className="flex flex-row flex-wrap gap-1.5">
            {PALETTE.map((swatch) => (
              <button
                key={swatch}
                type="button"
                disabled={colorMutation.isPending}
                onClick={() => colorMutation.mutate(swatch)}
                className="group relative size-7 rounded-full border-2 border-highlight-med transition-transform hover:scale-110 active:scale-95 disabled:opacity-50"
                style={{ backgroundColor: swatch }}
                title={swatch}
              >
                {currentColor === swatch && (
                  <span
                    className="absolute inset-0 flex items-center justify-center text-xs font-bold drop-shadow-md"
                    style={{
                      color:
                        swatch === "#FFFFFF" || swatch === "#FFD700"
                          ? "#333"
                          : "#fff",
                    }}
                  >
                    ✓
                  </span>
                )}
              </button>
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
                <span className="text-xs text-muted/50 px-1">
                  Нет предметов
                </span>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default TamagotchiTab;
