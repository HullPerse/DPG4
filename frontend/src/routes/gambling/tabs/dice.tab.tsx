import { useUserStore } from "@/store/user.store";
import { Button } from "@/components/ui/button.component";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { useRef, useCallback, useState, useMemo, memo } from "react";
import { CanvasTexture, Group, MeshStandardMaterial } from "three";
import UserApi from "@/api/user.api";
import ActivityApi from "@/api/activity.api";
import { Activity } from "@/types/activity";
import { cn } from "@/lib/utils";

const userApi = new UserApi();
const activityApi = new ActivityApi();

const BASE_PRICE = 3;
const REST_Y = 0.8;
const GRAVITY = 22;
const STAGGER_S = 0.65;
const MIN_AIR_TIME = 0.55;

// +x, -x, +y, -y, +z, -z
const FACE_VALUES = [3, 4, 1, 6, 2, 5] as const;

const TARGET_ROTATION: Record<number, [number, number, number]> = {
  1: [0, 0, 0],
  2: [-Math.PI / 2, 0, 0],
  3: [0, 0, -Math.PI / 2],
  4: [0, 0, Math.PI / 2],
  5: [Math.PI / 2, 0, 0],
  6: [Math.PI, 0, 0],
};

type DicePhase = "idle" | "flying" | "settle" | "done";

interface DiceSim {
  phase: DicePhase;
  pos: { x: number; y: number; z: number };
  vel: { x: number; y: number; z: number };
  rot: { x: number; y: number; z: number };
  angVel: { x: number; y: number; z: number };
  homeX: number;
  throwStart: number;
  settleStart: number;
  bounceCount: number;
}

function createDiceFaceTexture(value: number): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#232136";
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = "#191724";
  ctx.fillRect(8, 8, 240, 240);

  ctx.fillStyle = "#f6c177";
  const dot = (x: number, y: number, r = 16) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };

  const c = 128;
  const dots: Record<number, [number, number][]> = {
    1: [[c, c]],
    2: [
      [192, 64],
      [64, 192],
    ],
    3: [
      [192, 64],
      [128, 128],
      [64, 192],
    ],
    4: [
      [64, 64],
      [192, 64],
      [64, 192],
      [192, 192],
    ],
    5: [
      [64, 64],
      [192, 64],
      [128, 128],
      [64, 192],
      [192, 192],
    ],
    6: [
      [64, 64],
      [192, 64],
      [64, 128],
      [192, 128],
      [64, 192],
      [192, 192],
    ],
  };

  dots[value].forEach(([x, y]) => dot(x, y));
  const texture = new CanvasTexture(canvas);
  texture.anisotropy = 4;
  return texture;
}

function getRandomDice(): [number, number, number] {
  return [
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
  ];
}

function calculateResult(values: [number, number, number]): {
  payout: number;
  label: string;
  tone: "jackpot" | "win" | "lose" | "chance";
} {
  const sorted = [...values].sort((a, b) => a - b);
  const [a, b, c] = sorted;
  const unique = new Set(values);

  if (a === 1 && b === 2 && c === 3) {
    return {
      payout: -BASE_PRICE * 2,
      label: "1 · 2 · 3 — проигрыш ×2",
      tone: "lose",
    };
  }

  if (a === 4 && b === 5 && c === 6) {
    return {
      payout: BASE_PRICE * 2,
      label: "4 · 5 · 6 — выигрыш ×2",
      tone: "win",
    };
  }

  if (a === 1 && b === 1 && c === 1) {
    return {
      payout: BASE_PRICE * 5,
      label: "Три единицы — джекпот ×5",
      tone: "jackpot",
    };
  }

  if (unique.size === 1) {
    return {
      payout: BASE_PRICE * 2,
      label: `Три ${a} — выигрыш ×2`,
      tone: "win",
    };
  }

  if (unique.size === 2) {
    const win = Math.random() >= 0.5;
    return {
      payout: win ? BASE_PRICE + 2 : -(BASE_PRICE * 0.5),
      label: win ? "Пара — удача (+5)" : "Пара — не повезло (−1.5)",
      tone: "chance",
    };
  }

  const win = Math.random() >= 0.5;
  return {
    payout: win ? BASE_PRICE + 1 : 0,
    label: win
      ? "Разные числа — выигрыш (+4)"
      : "Разные числа — проигрыш (0)",
    tone: "chance",
  };
}

function lerpAngle(a: number, b: number, t: number) {
  let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

function createThrowSim(index: number, now: number): DiceSim {
  const homeX = (index - 1) * 2.4;
  const spread = (Math.random() - 0.5) * 1.2;

  return {
    phase: "flying",
    homeX,
    throwStart: now,
    settleStart: 0,
    bounceCount: 0,
    pos: {
      x: homeX + spread * 0.4,
      y: 3.8 + Math.random() * 1.2,
      z: -4.2 - Math.random() * 1.5,
    },
    vel: {
      x: (homeX - spread) * 0.35 + (Math.random() - 0.5) * 2.2,
      y: 4.5 + Math.random() * 2.5,
      z: 5.5 + Math.random() * 2,
    },
    rot: {
      x: Math.random() * Math.PI * 2,
      y: Math.random() * Math.PI * 2,
      z: Math.random() * Math.PI * 2,
    },
    angVel: {
      x: (Math.random() - 0.5) * 16,
      y: (Math.random() - 0.5) * 16,
      z: (Math.random() - 0.5) * 16,
    },
  };
}

function createIdleSim(index: number): DiceSim {
  const homeX = (index - 1) * 2.4;
  return {
    phase: "idle",
    homeX,
    throwStart: 0,
    settleStart: 0,
    bounceCount: 0,
    pos: { x: homeX, y: REST_Y, z: 0 },
    vel: { x: 0, y: 0, z: 0 },
    rot: { x: 0.25, y: 0.35 + index * 0.4, z: 0 },
    angVel: { x: 0, y: 0, z: 0 },
  };
}

function DiceMesh({
  index,
  targetValue,
  throwKey,
  onSettled,
}: {
  index: number;
  targetValue: number;
  throwKey: number;
  onSettled: () => void;
}) {
  const groupRef = useRef<Group>(null);
  const simRef = useRef<DiceSim>(createIdleSim(index));
  const settledRef = useRef(false);
  const lastThrowKey = useRef(0);

  const materials = useMemo(() => {
    return FACE_VALUES.map((faceValue) => {
      const tex = createDiceFaceTexture(faceValue);
      return new MeshStandardMaterial({
        map: tex,
        roughness: 0.35,
        metalness: 0.08,
      });
    });
  }, []);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const dt = Math.min(delta, 0.033);
    const now = state.clock.elapsedTime;

    if (throwKey !== lastThrowKey.current) {
      lastThrowKey.current = throwKey;
      settledRef.current = false;
      simRef.current = createThrowSim(index, now);
    }

    const sim = simRef.current;

    if (sim.phase === "idle") {
      group.position.set(sim.pos.x, sim.pos.y, sim.pos.z);
      group.rotation.set(sim.rot.x, sim.rot.y, sim.rot.z);
      return;
    }

    if (sim.phase === "flying") {
      sim.vel.y -= GRAVITY * dt;
      sim.pos.x += sim.vel.x * dt;
      sim.pos.y += sim.vel.y * dt;
      sim.pos.z += sim.vel.z * dt;

      sim.rot.x += sim.angVel.x * dt;
      sim.rot.y += sim.angVel.y * dt;
      sim.rot.z += sim.angVel.z * dt;

      sim.vel.x *= 1 - 0.4 * dt;
      sim.vel.z *= 1 - 0.35 * dt;
      sim.angVel.x *= 1 - 0.8 * dt;
      sim.angVel.y *= 1 - 0.8 * dt;
      sim.angVel.z *= 1 - 0.8 * dt;

      if (sim.pos.y <= REST_Y) {
        sim.pos.y = REST_Y;
        sim.bounceCount += 1;

        const restitution = sim.bounceCount > 2 ? 0.18 : 0.42;
        sim.vel.y = Math.abs(sim.vel.y) * restitution;
        sim.vel.x += (Math.random() - 0.5) * 1.4;
        sim.vel.z += (Math.random() - 0.5) * 1.2;

        sim.angVel.x += (Math.random() - 0.5) * 2;
        sim.angVel.y += (Math.random() - 0.5) * 2;
        sim.angVel.z += (Math.random() - 0.5) * 2;

        if (sim.bounceCount > 1) {
          sim.vel.x *= 0.55;
          sim.vel.z *= 0.55;
          sim.angVel.x *= 0.45;
          sim.angVel.y *= 0.45;
          sim.angVel.z *= 0.45;
        }
      }

      if (sim.pos.y <= REST_Y + 0.1) {
        sim.angVel.x *= 1 - 5 * dt;
        sim.angVel.y *= 1 - 5 * dt;
        sim.angVel.z *= 1 - 5 * dt;
      }

      const speed = Math.hypot(sim.vel.x, sim.vel.y, sim.vel.z);
      const angSpeed = Math.hypot(sim.angVel.x, sim.angVel.y, sim.angVel.z);
      const airTime = now - sim.throwStart;
      const settleGate = MIN_AIR_TIME + index * STAGGER_S;
      const onTable = sim.pos.y <= REST_Y + 0.02 && sim.bounceCount >= 1;

      if (onTable && airTime >= settleGate && speed < 1.35 && angSpeed < 2.5) {
        sim.phase = "settle";
        sim.settleStart = now;
        sim.vel = { x: 0, y: 0, z: 0 };
        sim.angVel = { x: 0, y: 0, z: 0 };
      }

      group.position.set(sim.pos.x, sim.pos.y, sim.pos.z);
      group.rotation.set(sim.rot.x, sim.rot.y, sim.rot.z);
      return;
    }

    if (sim.phase === "settle") {
      const [tx, ty, tz] = TARGET_ROTATION[targetValue];
      const t = Math.min((now - sim.settleStart) * 2.8, 1);
      const ease = 1 - Math.pow(1 - t, 3);

      sim.pos.x += (sim.homeX - sim.pos.x) * ease * 0.18;
      sim.pos.y += (REST_Y - sim.pos.y) * ease * 0.18;
      sim.pos.z += (0 - sim.pos.z) * ease * 0.18;

      sim.rot.x = lerpAngle(sim.rot.x, tx, ease * 0.22);
      sim.rot.y = lerpAngle(sim.rot.y, ty, ease * 0.22);
      sim.rot.z = lerpAngle(sim.rot.z, tz, ease * 0.22);

      group.position.set(sim.pos.x, sim.pos.y, sim.pos.z);
      group.rotation.set(sim.rot.x, sim.rot.y, sim.rot.z);

      if (t >= 1 && !settledRef.current) {
        settledRef.current = true;
        sim.phase = "done";
        onSettled();
      }
      return;
    }

    if (sim.phase === "done") {
      const [tx, ty, tz] = TARGET_ROTATION[targetValue];
      group.position.set(sim.homeX, REST_Y, 0);
      group.rotation.set(tx, ty, tz);
    }
  });

  return (
    <group ref={groupRef}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.6, 1.6, 1.6]} />
        {materials.map((material, i) => (
          <primitive key={i} object={material} attach={`material-${i}`} />
        ))}
      </mesh>
    </group>
  );
}

function DiceScene({
  throwKey,
  finalValues,
  onDieSettled,
}: {
  throwKey: number;
  finalValues: [number, number, number] | null;
  onDieSettled: (index: number) => void;
}) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 7, 10], fov: 40 }}
      className="h-full w-full"
      gl={{ antialias: true, alpha: true }}
    >
      <color attach="background" args={["#191724"]} />
      <ambientLight intensity={0.45} />
      <directionalLight
        castShadow
        position={[6, 10, 4]}
        intensity={1.1}
        shadow-mapSize={[512, 512]}
      />
      <directionalLight
        position={[-4, 3, -2]}
        intensity={0.35}
        color="#c4a7e7"
      />
      <pointLight position={[0, 2, 6]} intensity={0.4} color="#f6c177" />

      <group position={[0, -0.2, 0]}>
        {([0, 1, 2] as const).map((i) => (
          <DiceMesh
            key={i}
            index={i}
            throwKey={throwKey}
            targetValue={finalValues?.[i] ?? 1}
            onSettled={() => onDieSettled(i)}
          />
        ))}
      </group>

      <ContactShadows
        position={[0, -1.1, 0]}
        opacity={0.45}
        scale={12}
        blur={2.5}
        far={4}
      />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -1.1, 0]}
        receiveShadow
      >
        <planeGeometry args={[20, 20]} />
        <shadowMaterial opacity={0.25} />
      </mesh>
    </Canvas>
  );
}

const RULES = [
  { text: "1 · 2 · 3", result: "−6 (×2 ставки)" },
  { text: "4 · 5 · 6", result: "+6 (×2 ставки)" },
  { text: "1 · 1 · 1", result: "+15 (джекпот ×5)" },
  { text: "Три одинаковых (кроме 1)", result: "+6 (×2 ставки)" },
  { text: "Пара", result: "50%: +5 / −1.5" },
  { text: "Остальное", result: "50%: +4 / 0" },
];

function DiceTab() {
  const user = useUserStore((s) => s.user);
  const [animating, setAnimating] = useState(false);
  const [throwKey, setThrowKey] = useState(0);
  const [pendingValues, setPendingValues] = useState<
    [number, number, number] | null
  >(null);
  const [revealedValues, setRevealedValues] = useState<
    [number | null, number | null, number | null]
  >([null, null, null]);
  const [result, setResult] = useState<{
    net: number;
    label: string;
    tone: "jackpot" | "win" | "lose" | "chance";
  } | null>(null);

  const settleWaitRef = useRef<{
    resolve: () => void;
    settled: Set<number>;
  } | null>(null);
  const pendingRef = useRef<[number, number, number] | null>(null);
  const revealTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const balance = user?.money ?? 0;

  const waitForAllDice = useCallback(
    () =>
      new Promise<void>((resolve) => {
        settleWaitRef.current = { resolve, settled: new Set() };
      }),
    [],
  );

  const handleDieSettled = useCallback((index: number) => {
    const values = pendingRef.current;
    if (!values) return;

    const timeoutId = setTimeout(() => {
      setRevealedValues((prev) => {
        const next: [number | null, number | null, number | null] = [...prev];
        next[index] = values[index];
        return next;
      });
    }, index * 300);

    revealTimeoutsRef.current.push(timeoutId);

    const waiter = settleWaitRef.current;
    if (!waiter) return;

    waiter.settled.add(index);
    if (waiter.settled.size === 3) {
      waiter.resolve();
      settleWaitRef.current = null;
    }
  }, []);

  const handleRoll = useCallback(async () => {
    if (animating || !user || balance < BASE_PRICE) return;

    revealTimeoutsRef.current.forEach(clearTimeout);
    revealTimeoutsRef.current = [];
    setResult(null);
    setRevealedValues([null, null, null]);

    const finalValues = getRandomDice();
    pendingRef.current = finalValues;
    setPendingValues(finalValues);

    try {
      const updated = await userApi.scoreUser(String(user.id), -BASE_PRICE);
      useUserStore.setState({ user: updated });
    } catch {
      setPendingValues(null);
      return;
    }

    setAnimating(true);
    setThrowKey((k) => k + 1);

    const allSettled = waitForAllDice();
    await allSettled;

    const res = calculateResult(finalValues);
    const net = -BASE_PRICE + res.payout;

    try {
      const updated = await userApi.scoreUser(String(user.id), res.payout);
      useUserStore.setState({ user: updated });
    } catch {
      setAnimating(false);
      setPendingValues(null);
      return;
    }

    const netLabel =
      net >= 0 ? `${res.label} · итого +${net}` : `${res.label} · итого ${net}`;

    setResult({ net, label: netLabel, tone: res.tone });
    setAnimating(false);

    try {
      const activityData = {
        author: user.id,
        image: user.avatar,
        type: "emoji",
        text: `🎲 ${user.username} бросил кости [${finalValues.join(", ")}]: ${netLabel}`,
      } as Activity;

      await activityApi.createActivity(activityData);
    } catch {
      // activity is non-critical; balance already updated
    }
  }, [animating, user, balance, waitForAllDice]);

  const resultColor =
    result === null
      ? ""
      : result.net > 0
        ? result.tone === "jackpot"
          ? "text-amber-400"
          : "text-emerald-400"
        : result.net < 0
          ? "text-red-400"
          : "text-muted";

  const displayLine = revealedValues.some((v) => v !== null)
    ? `[${revealedValues.map((v) => v ?? "·").join(" · ")}]`
    : animating
      ? "[ · · · ]"
      : null;

  return (
    <main className="flex h-full w-full flex-col items-center gap-3 p-2">
      <div className="flex w-full max-w-lg flex-col items-center gap-1 border border-highlight-high bg-background/60 px-4 py-3">
        <span className="text-lg font-bold">Баланс: {balance}</span>
        <span className="text-sm text-muted">
          Стоимость броска: {BASE_PRICE}
        </span>
        {result && (
          <span className={cn("text-center text-lg font-bold", resultColor)}>
            {result.label}
          </span>
        )}
        {displayLine && (
          <span className="text-sm text-primary tracking-widest">
            {displayLine}
          </span>
        )}
      </div>

      <div className="relative w-full min-h-[260px] flex-1 overflow-hidden border border-highlight-high/60">
        <DiceScene
          throwKey={throwKey}
          finalValues={pendingValues}
          onDieSettled={handleDieSettled}
        />
        {!animating && revealedValues.every((v) => v === null) && (
          <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-sm text-muted">
            Нажми «Бросить», чтобы начать игру
          </p>
        )}
      </div>

      <Button
        variant="info"
        className="h-12 w-full max-w-xs text-lg font-bold"
        disabled={animating || balance < BASE_PRICE}
        onClick={handleRoll}
      >
        {animating ? "Бросаем..." : `Бросить (${BASE_PRICE})`}
      </Button>

      <details
        className="w-full max-w-lg border border-highlight-high/60 bg-background/40 px-3 py-2 text-sm"
        open
      >
        <summary className="cursor-pointer font-semibold text-muted select-none">
          Правила
        </summary>
        <ul className="mt-2 flex flex-col gap-1 pl-1">
          {RULES.map((rule) => (
            <li key={rule.text} className="flex justify-between gap-2">
              <span>{rule.text}</span>
              <span className="text-right font-medium">{rule.result}</span>
            </li>
          ))}
        </ul>
      </details>
    </main>
  );
}

export default memo(DiceTab);
