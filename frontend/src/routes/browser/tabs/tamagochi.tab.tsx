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
} from "@/api/pet.api";
import { useUserStore } from "@/store/user.store";
import { WindowLoader } from "@/components/shared/loader.component";
import { WindowError } from "@/components/shared/error.component";
import { Button } from "@/components/ui/button.component";
import { Apple, Hand, Bed } from "lucide-react";

useGLTF.preload("/rat.glb");

const DECAY_INTERVAL_MS = 5000;
const DECAY_PER_TICK = { hunger: 0.4, happiness: 0.25, energy: 0.33 };
const REWARD_THRESHOLD = 80;

function getMood(
  hunger: number,
  happiness: number,
  energy: number,
): { emoji: string; label: string } {
  if (hunger < 30) return { emoji: "🍖", label: "Голоден" };
  if (energy < 30) return { emoji: "😴", label: "Хочет спать" };
  if (happiness < 30) return { emoji: "😢", label: "Грустный" };
  if (happiness > 70 && hunger > 70 && energy > 70)
    return { emoji: "😊", label: "Счастлив" };
  return { emoji: "😐", label: "Нормально" };
}

const animEmoji: Record<string, string> = {
  feed: "🍖",
  pet: "💕",
  sleep: "😴",
};

function RatModel({ reaction }: { reaction: string | null }) {
  const { scene } = useGLTF("/rat.glb");
  const groupRef = useRef<THREE.Group>(null);
  const cloned = useMemo(() => scene.clone(), [scene]);
  const animRef = useRef<{ type: string; elapsed: number } | null>(null);
  const prevReaction = useRef<string | null>(null);

  if (reaction && reaction !== prevReaction.current) {
    animRef.current = { type: reaction, elapsed: 0 };
    prevReaction.current = reaction;
  }

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    const anim = animRef.current;
    if (!anim) {
      groupRef.current.scale.setScalar(1.15);
      groupRef.current.rotation.z = 0;
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

function SceneContent({ reaction }: { reaction: string | null }) {
  return (
    <>
      <OrbitControls enablePan={false} />
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
      <group position={[0, -0.8, 0]}>
        <Suspense fallback={null}>
          <RatModel reaction={reaction} />
        </Suspense>
      </group>
    </>
  );
}

function StatBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="flex flex-col gap-0.5 flex-1">
      <div className="flex justify-between text-xs text-muted">
        <span>{label}</span>
        <span>{Math.round(clamped)}%</span>
      </div>
      <div className="h-2 w-full bg-highlight-high rounded-full overflow-hidden border-2 border-highlight-med">
        <div
          className="h-full transition-all duration-500 ease-linear rounded-full"
          style={{ width: `${clamped}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function MoodBubble({ emoji, label }: { emoji: string; label: string }) {
  return (
    <div className="absolute top-2 right-2 flex flex-col items-center gap-0.5 bg-background/80 border-2 border-highlight-high rounded-lg px-3 py-1.5 z-10 select-none">
      <span className="text-3xl">{emoji}</span>
      <span className="text-xs text-muted font-medium">{label}</span>
    </div>
  );
}

function FloatingEffect({ reaction }: { reaction: string | null }) {
  const [items, setItems] = useState<{ id: number; emoji: string }[]>([]);
  const idRef = useRef(0);

  useEffect(() => {
    if (!reaction) return;
    const id = ++idRef.current;
    const emoji = animEmoji[reaction] ?? "✨";
    setItems((prev) => [...prev, { id, emoji }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }, 1000);
  }, [reaction]);

  return (
    <div className="absolute inset-x-0 bottom-6 flex justify-center pointer-events-none z-20">
      {items.map((item) => (
        <div key={item.id} className="text-4xl animate-pet-float">
          {item.emoji}
        </div>
      ))}
    </div>
  );
}

function RewardsBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-green-900/90 border-2 border-green-500 rounded-lg px-4 py-2 z-30 animate-pulse text-sm font-bold text-green-300 whitespace-nowrap">
      {message}
    </div>
  );
}

function TamagotchiTab() {
  const user = useUserStore((state) => state.user);
  const queryClient = useQueryClient();

  const [localHunger, setLocalHunger] = useState(100);
  const [localHappiness, setLocalHappiness] = useState(100);
  const [localEnergy, setLocalEnergy] = useState(100);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [rewardMessage, setRewardMessage] = useState<string | null>(null);
  const rewardCheckedRef = useRef(false);
  const actionTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["pet", user?.id],
    queryFn: () => getPet(user!.id),
    enabled: !!user?.id,
    refetchOnMount: "always",
  });

  useEffect(() => {
    if (!data) return;
    setLocalHunger(data.hunger);
    setLocalHappiness(data.happiness);
    setLocalEnergy(data.energy);
  }, [data]);

  useEffect(() => {
    const interval = setInterval(() => {
      setLocalHunger((h) => Math.max(0, h - DECAY_PER_TICK.hunger));
      setLocalHappiness((h) => Math.max(0, h - DECAY_PER_TICK.happiness));
      setLocalEnergy((e) => Math.max(0, e - DECAY_PER_TICK.energy));
    }, DECAY_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!data || !user || rewardCheckedRef.current) return;
    if (
      data.hunger > REWARD_THRESHOLD &&
      data.happiness > REWARD_THRESHOLD &&
      data.energy > REWARD_THRESHOLD
    ) {
      claimDailyReward(user.id).then((result) => {
        if (result.claimed) {
          if (result.reward === "money") {
            setRewardMessage(`🎉 Крыса принесла ${result.amount} монет!`);
          } else {
            setRewardMessage(`🎉 Крыса принесла предмет: ${result.itemLabel}!`);
          }
          setTimeout(() => setRewardMessage(null), 4000);
        }
      });
    }
    rewardCheckedRef.current = true;
  }, [data, user]);

  const refetchPet = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["pet", user?.id] });
  }, [queryClient, user?.id]);

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
    onSuccess: (pet) => {
      setLocalHunger(pet.hunger);
      refetchPet();
    },
  });

  const petMutation = useMutation({
    mutationFn: () => petPet(user!.id),
    onSuccess: (pet) => {
      setLocalHappiness(pet.happiness);
      refetchPet();
    },
  });

  const sleepMutation = useMutation({
    mutationFn: () => sleepPet(user!.id),
    onSuccess: (pet) => {
      setLocalEnergy(pet.energy);
      refetchPet();
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

  const mood = getMood(localHunger, localHappiness, localEnergy);

  return (
    <main className="flex flex-col w-full h-full gap-2 p-2">
      <section className="flex flex-row gap-3 p-2 bg-background border-2 border-highlight-high rounded-lg">
        <StatBar label="🍖 Голод" value={localHunger} color="#f6c177" />
        <StatBar label="😊 Счастье" value={localHappiness} color="#c4a7e7" />
        <StatBar label="🔋 Энергия" value={localEnergy} color="#9ccfd8" />
      </section>

      <section className="relative flex-1 rounded-lg overflow-hidden border-2 border-highlight-high">
        <MoodBubble emoji={mood.emoji} label={mood.label} />
        <FloatingEffect reaction={lastAction} />
        <RewardsBanner message={rewardMessage} />
        <Canvas
          camera={{ position: [3.5, 2, 5], fov: 42 }}
          className="h-full w-full"
          gl={{ antialias: true, alpha: true }}
        >
          <Suspense fallback={null}>
            <SceneContent reaction={lastAction} />
          </Suspense>
        </Canvas>
      </section>

      <section className="flex flex-row gap-2 justify-center p-2 bg-background border-2 border-highlight-high rounded-lg">
        <Button
          variant="default"
          disabled={feedMutation.isPending}
          onClick={() => handleAction("feed")}
          className="flex items-center gap-2 flex-1"
        >
          <Apple className="size-5" />
          Кормить
        </Button>
        <Button
          variant="default"
          disabled={petMutation.isPending}
          onClick={() => handleAction("pet")}
          className="flex items-center gap-2 flex-1"
        >
          <Hand className="size-5" />
          Гладить
        </Button>
        <Button
          variant="default"
          disabled={sleepMutation.isPending}
          onClick={() => handleAction("sleep")}
          className="flex items-center gap-2 flex-1"
        >
          <Bed className="size-5" />
          Спать
        </Button>
      </section>
    </main>
  );
}

export default TamagotchiTab;
