import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Physics,
  RigidBody,
  BallCollider,
  CuboidCollider,
  type RapierRigidBody,
} from "@react-three/rapier";
import { Html, useGLTF } from "@react-three/drei";
import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import {
  BOARD_WIDTH,
  PACHINKO_SLOT_COUNT,
  PACHINKO_SLOT_MULTIPLIERS,
  getSlotEdges,
  getSlotWidths,
  slotCenterX,
  slotColor,
  slotIndexFromX,
} from "@/lib/gambling/pachinko.utils";
import type { RiskGateChoice } from "@/types/gamble";

useGLTF.preload("/models/rat.glb");

const BOARD_HALF = BOARD_WIDTH / 2;
const BOARD_TOP = 17.2;
const BOARD_BOTTOM = 0.9;
const BOARD_HEIGHT = BOARD_TOP - BOARD_BOTTOM;
const BOARD_CENTER_Y = (BOARD_TOP + BOARD_BOTTOM) / 2;
const DROP_Y = 16.4;
const SETTLE_Y = 2.35;
const PLANE_Z = 0;

const PEG_ROWS = 16;
const PEG_COLS = 13;
const PEG_RADIUS = 0.13;
const BALL_RADIUS = 0.2;
const LANE_HALF_Z = 0.35;

const VIEW_PAD_X = 0.35;
const VIEW_PAD_TOP = 0.45;
const VIEW_PAD_BOTTOM = 0.15;

const PEG_ZONE_COLORS: Record<string, string> = {
  high: "#c4a7e7",
  mid: "#f6c177",
  low: "#9ccfd8",
  trap: "#eb6f92",
};

function buildPegPositions(): [number, number, number][] {
  const pegs: [number, number, number][] = [];
  const rowSpan = 12.8;
  const topY = 15.2;
  const stepY = rowSpan / (PEG_ROWS - 1);
  const usable = BOARD_WIDTH - 1.4;
  const stepX = usable / (PEG_COLS - 1);
  const slotWidths = getSlotWidths(3);
  const edges = getSlotEdges(3);

  for (let row = 0; row < PEG_ROWS; row++) {
    const y = topY - row * stepY;
    const offset = row % 2 === 0 ? 0 : 0.5;
    for (let col = 0; col < PEG_COLS; col++) {
      const x = -usable / 2 + col * stepX + offset;
      if (Math.abs(x) > BOARD_HALF - 0.15) continue;
      let zone = "mid";
      for (let s = 0; s < PACHINKO_SLOT_COUNT; s++) {
        if (x >= edges[s] && x < edges[s] + slotWidths[s]) {
          const m = PACHINKO_SLOT_MULTIPLIERS[s];
          if (m >= 5) zone = "high";
          else if (m >= 2) zone = "mid";
          else if (m >= 1) zone = "low";
          else zone = "trap";
          break;
        }
      }
      pegs.push([
        x,
        y,
        zone === "high" ? 0 : zone === "mid" ? 1 : zone === "low" ? 2 : 3,
      ]);
    }
  }
  return pegs;
}

const PEG_POSITIONS = buildPegPositions();
const PEG_COLORS = [
  PEG_ZONE_COLORS.high,
  PEG_ZONE_COLORS.mid,
  PEG_ZONE_COLORS.low,
  PEG_ZONE_COLORS.trap,
];

function FitOrthoCamera() {
  const { camera, size } = useThree();

  useLayoutEffect(() => {
    if (!(camera instanceof THREE.OrthographicCamera)) return;

    const aspect = size.width / size.height;
    const viewW = BOARD_WIDTH + VIEW_PAD_X * 2;
    const viewH = BOARD_HEIGHT + VIEW_PAD_TOP + VIEW_PAD_BOTTOM;

    if (aspect >= viewW / viewH) {
      const halfH = viewH / 2;
      camera.top = halfH - VIEW_PAD_BOTTOM * 0.35;
      camera.bottom = -halfH - VIEW_PAD_TOP * 0.15;
      camera.left = -halfH * aspect;
      camera.right = halfH * aspect;
    } else {
      const halfW = viewW / 2;
      camera.left = -halfW;
      camera.right = halfW;
      camera.top = halfW / aspect - VIEW_PAD_BOTTOM * 0.2;
      camera.bottom = -halfW / aspect - VIEW_PAD_TOP * 0.25;
    }

    const lookY = BOARD_CENTER_Y - 0.4;
    camera.position.set(0, lookY, 10);
    camera.lookAt(0, lookY, PLANE_Z);
    camera.near = 0.1;
    camera.far = 30;
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height]);

  return null;
}

function ShakeController({ intensity }: { intensity: number }) {
  const { camera } = useThree();

  useFrame(() => {
    if (!(camera instanceof THREE.OrthographicCamera) || intensity <= 0) return;
    const sx = (Math.random() - 0.5) * intensity * 0.08;
    const sy = (Math.random() - 0.5) * intensity * 0.08;
    const lookY = BOARD_CENTER_Y - 0.4;
    camera.position.set(sx, lookY + sy, 10);
    camera.lookAt(sx * 0.3, lookY + sy * 0.3, PLANE_Z);
  });

  return null;
}

function FramePillars() {
  return (
    <group position={[0, BOARD_CENTER_Y, -0.15]}>
      {/* Left pillar */}
      <mesh position={[-BOARD_HALF - 0.55, 0, 0]}>
        <boxGeometry args={[0.45, BOARD_HEIGHT + 0.6, 0.3]} />
        <meshStandardMaterial color="#12101e" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Right pillar */}
      <mesh position={[BOARD_HALF + 0.55, 0, 0]}>
        <boxGeometry args={[0.45, BOARD_HEIGHT + 0.6, 0.3]} />
        <meshStandardMaterial color="#12101e" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Bolts left */}
      {[-2, 0, 2].map((yOff, i) => (
        <mesh key={`lb-${i}`} position={[-BOARD_HALF - 0.55, yOff, 0.16]}>
          <circleGeometry args={[0.06, 8]} />
          <meshStandardMaterial
            color="#524f67"
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
      ))}
      {/* Bolts right */}
      {[-2, 0, 2].map((yOff, i) => (
        <mesh key={`rb-${i}`} position={[BOARD_HALF + 0.55, yOff, 0.16]}>
          <circleGeometry args={[0.06, 8]} />
          <meshStandardMaterial
            color="#524f67"
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
      ))}
      {/* Top arch */}
      <mesh position={[0, BOARD_TOP + 0.45, 0]}>
        <boxGeometry args={[BOARD_WIDTH + 1.5, 0.25, 0.3]} />
        <meshStandardMaterial color="#1a1828" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Arch accent bar */}
      <mesh position={[0, BOARD_TOP + 0.3, 0.05]}>
        <boxGeometry args={[BOARD_WIDTH + 0.8, 0.06, 0.02]} />
        <meshStandardMaterial
          color="#c4a7e7"
          emissive="#c4a7e7"
          emissiveIntensity={0.3}
        />
      </mesh>
      {/* Arch title */}
      <Html
        position={[0, BOARD_TOP + 0.5, 0.1]}
        center
        transform
        distanceFactor={18}
      >
        <span
          style={{
            color: "#c4a7e7",
            fontSize: "20px",
            fontWeight: 900,
            fontFamily: "monospace",
            letterSpacing: "6px",
            textShadow: "0 0 12px #c4a7e766, 0 2px 4px rgba(0,0,0,0.9)",
            whiteSpace: "nowrap",
          }}
        >
          パチンコ
        </span>
      </Html>
      {/* Base panel */}
      <mesh position={[0, 0.35, 0]}>
        <boxGeometry args={[BOARD_WIDTH + 1.2, 0.5, 0.25]} />
        <meshStandardMaterial color="#12101e" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Base hazard stripes */}
      {Array.from({ length: 14 }, (_, i) => {
        const x = -BOARD_HALF - 0.4 + i * 1.3;
        return (
          <mesh key={`haz-${i}`} position={[x, 0.15, 0.07]}>
            <planeGeometry args={[0.4, 0.12]} />
            <meshStandardMaterial
              color={i % 2 === 0 ? "#eb6f92" : "#f6c177"}
              opacity={0.6}
              transparent
            />
          </mesh>
        );
      })}
    </group>
  );
}

function BoardBackdrop() {
  return (
    <group position={[0, BOARD_CENTER_Y, -0.12]}>
      <mesh receiveShadow>
        <planeGeometry args={[BOARD_WIDTH + 0.5, BOARD_HEIGHT + 0.35]} />
        <meshStandardMaterial color="#1e1d2a" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[BOARD_WIDTH + 0.22, BOARD_HEIGHT + 0.08]} />
        <meshStandardMaterial color="#13111e" roughness={0.9} />
      </mesh>
    </group>
  );
}

function SlotStrip({
  highlightIndex,
  bid,
  glowIntensity,
}: {
  highlightIndex: number | null;
  bid: number;
  glowIntensity: number;
}) {
  const slotWidths = getSlotWidths(bid);
  return (
    <group position={[0, 1.38, 0.02]}>
      {PACHINKO_SLOT_MULTIPLIERS.map((mult, i) => {
        const x = slotCenterX(i, bid);
        const lit = highlightIndex === i;
        const color = slotColor(mult);
        const label = `${mult}x`;
        const baseEmissive = lit ? 0.95 : 0.18;
        const pulseEmissive =
          glowIntensity > 0
            ? baseEmissive + (1 - baseEmissive) * glowIntensity * 0.5
            : baseEmissive;
        return (
          <group key={i} position={[x, 0, 0]}>
            <mesh>
              <boxGeometry args={[slotWidths[i] * 0.88, 0.62, 0.08]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={lit ? 0.95 : pulseEmissive}
                roughness={0.5}
              />
            </mesh>
            <Html
              center
              transform
              distanceFactor={14}
              style={{ pointerEvents: "none", userSelect: "none" }}
            >
              <span
                style={{
                  color: lit ? "#fff" : color,
                  fontSize: mult >= 10 ? "9px" : "10px",
                  fontWeight: 800,
                  fontFamily: "monospace",
                  textShadow: "0 1px 3px rgba(0,0,0,0.9)",
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </span>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

function PegField() {
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    meshRefs.current.forEach((mesh, idx) => {
      if (!mesh) return;
      const zone = PEG_POSITIONS[idx]?.[2] ?? 1;
      const pulse = 0.15 + Math.sin(t * 1.2 + idx * 0.3) * 0.08;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = zone === 0 ? pulse * 0.8 : pulse * 0.4;
    });
  });

  return (
    <>
      {PEG_POSITIONS.map(([x, y, zoneIdx], i) => {
        const color = PEG_COLORS[zoneIdx] ?? "#b4b0c8";
        return (
          <RigidBody
            key={i}
            type="fixed"
            colliders={false}
            position={[x, y, PLANE_Z]}
            friction={0.2}
            restitution={0.72}
          >
            <BallCollider args={[PEG_RADIUS]} />
            <mesh
              ref={(el) => {
                meshRefs.current[i] = el;
              }}
              castShadow
            >
              <sphereGeometry args={[PEG_RADIUS, 12, 12]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={0.2}
                metalness={0.3}
                roughness={0.3}
              />
            </mesh>
          </RigidBody>
        );
      })}
    </>
  );
}

function BoardWalls({ bid }: { bid: number }) {
  const slotEdges = getSlotEdges(bid);
  return (
    <>
      <RigidBody
        type="fixed"
        colliders={false}
        position={[-(BOARD_HALF - 0.22), BOARD_CENTER_Y, PLANE_Z]}
      >
        <CuboidCollider args={[0.1, BOARD_HEIGHT / 2 - 0.3, LANE_HALF_Z]} />
      </RigidBody>
      <RigidBody
        type="fixed"
        colliders={false}
        position={[-BOARD_HALF - 0.18, BOARD_CENTER_Y, PLANE_Z]}
      >
        <CuboidCollider args={[0.18, BOARD_HEIGHT / 2 + 0.4, LANE_HALF_Z]} />
      </RigidBody>
      <RigidBody
        type="fixed"
        colliders={false}
        position={[BOARD_HALF + 0.12, BOARD_CENTER_Y, PLANE_Z]}
      >
        <CuboidCollider args={[0.12, BOARD_HEIGHT / 2 + 0.4, LANE_HALF_Z]} />
      </RigidBody>
      <RigidBody
        type="fixed"
        colliders={false}
        position={[0, BOARD_TOP + 0.1, PLANE_Z]}
      >
        <CuboidCollider args={[BOARD_HALF + 0.15, 0.14, LANE_HALF_Z]} />
      </RigidBody>
      <RigidBody
        type="fixed"
        colliders={false}
        position={[0, BOARD_CENTER_Y, PLANE_Z + LANE_HALF_Z]}
      >
        <CuboidCollider
          args={[BOARD_HALF + 0.2, BOARD_HEIGHT / 2 + 0.5, 0.04]}
        />
      </RigidBody>
      <RigidBody
        type="fixed"
        colliders={false}
        position={[0, BOARD_CENTER_Y, PLANE_Z - LANE_HALF_Z]}
      >
        <CuboidCollider
          args={[BOARD_HALF + 0.2, BOARD_HEIGHT / 2 + 0.5, 0.04]}
        />
      </RigidBody>
      {Array.from({ length: PACHINKO_SLOT_COUNT - 1 }, (_, i) => {
        const x = slotEdges[i + 1];
        return (
          <RigidBody
            key={i}
            type="fixed"
            colliders={false}
            position={[x, 1.72, PLANE_Z]}
          >
            <CuboidCollider args={[0.03, 0.72, LANE_HALF_Z * 0.85]} />
          </RigidBody>
        );
      })}
      <RigidBody type="fixed" colliders={false} position={[0, 0.92, PLANE_Z]}>
        <CuboidCollider args={[BOARD_HALF + 0.15, 0.08, LANE_HALF_Z]} />
      </RigidBody>
    </>
  );
}

function TopChute({ startX }: { startX: number }) {
  return (
    <group position={[startX, DROP_Y + 0.3, PLANE_Z]}>
      <mesh>
        <boxGeometry args={[0.35, 0.35, 0.3]} />
        <meshStandardMaterial color="#2a273f" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.05, 0.16]}>
        <planeGeometry args={[0.15, 0.1]} />
        <meshStandardMaterial color="#eb6f92" opacity={0.8} transparent />
      </mesh>
    </group>
  );
}

function RiskGateDoors({
  show,
  choice,
}: {
  show: boolean;
  choice: RiskGateChoice;
}) {
  if (!show) return null;
  const gateY = DROP_Y + 0.2;
  return (
    <group position={[0, gateY, 0.05]}>
      {/* Left gate */}
      <group position={[-BOARD_HALF * 0.35, 0, 0]}>
        <mesh>
          <boxGeometry args={[BOARD_HALF * 0.45, 0.6, 0.1]} />
          <meshStandardMaterial
            color={choice === "left" ? "#f6c177" : "#524f67"}
            emissive={choice === "left" ? "#f6c177" : "#524f67"}
            emissiveIntensity={choice === "left" ? 0.5 : 0.1}
            metalness={0.6}
            roughness={0.3}
          />
        </mesh>
        <Html center transform distanceFactor={16}>
          <span
            style={{
              color: choice === "left" ? "#000" : "#e0def4",
              fontSize: "10px",
              fontWeight: 900,
              fontFamily: "monospace",
              letterSpacing: "1px",
            }}
          >
            ЛЕВЫЙ
          </span>
        </Html>
      </group>
      {/* Right gate */}
      <group position={[BOARD_HALF * 0.35, 0, 0]}>
        <mesh>
          <boxGeometry args={[BOARD_HALF * 0.45, 0.6, 0.1]} />
          <meshStandardMaterial
            color={choice === "right" ? "#f6c177" : "#524f67"}
            emissive={choice === "right" ? "#f6c177" : "#524f67"}
            emissiveIntensity={choice === "right" ? 0.5 : 0.1}
            metalness={0.6}
            roughness={0.3}
          />
        </mesh>
        <Html center transform distanceFactor={16}>
          <span
            style={{
              color: choice === "right" ? "#000" : "#e0def4",
              fontSize: "10px",
              fontWeight: 900,
              fontFamily: "monospace",
              letterSpacing: "1px",
            }}
          >
            ПРАВЫЙ
          </span>
        </Html>
      </group>
      {/* Center divider */}
      <mesh position={[0, 0, 0.11]}>
        <boxGeometry args={[0.06, 0.5, 0.02]} />
        <meshStandardMaterial
          color="#eb6f92"
          emissive="#eb6f92"
          emissiveIntensity={0.3}
        />
      </mesh>
    </group>
  );
}

function WinBurst({ trigger }: { trigger: number }) {
  const particlesRef = useRef<THREE.Group>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (trigger === 0) return;
    setActive(true);
    const timer = setTimeout(() => setActive(false), 1000);
    return () => clearTimeout(timer);
  }, [trigger]);

  useFrame((_, delta) => {
    if (!active || !particlesRef.current) return;
    particlesRef.current.children.forEach((child) => {
      const mesh = child as THREE.Mesh;
      const pos = mesh.position;
      const dir = pos.clone().normalize();
      const speed = 1.5;
      pos.x += dir.x * speed * delta;
      pos.y += dir.y * speed * delta;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.opacity = Math.max(0, mat.opacity - delta * 1.5);
    });
  });

  if (!active) return null;

  const colors = ["#f6c177", "#c4a7e7", "#e0def4"];
  const particleCount = 8;
  return (
    <group ref={particlesRef} position={[0, SETTLE_Y + 0.5, PLANE_Z]}>
      {Array.from({ length: particleCount }, (_, i) => {
        const angle = (i / particleCount) * Math.PI * 2;
        const r = 0.15 + Math.random() * 0.2;
        return (
          <mesh
            key={i}
            position={[Math.cos(angle) * r, Math.sin(angle) * r, 0]}
          >
            <sphereGeometry args={[0.04, 6, 6]} />
            <meshStandardMaterial
              color={colors[i % colors.length]}
              emissive={colors[i % colors.length]}
              emissiveIntensity={0.8}
              transparent
              opacity={1}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function RatBall({
  startX,
  simulating,
  onSettled,
  bid,
  kickTrigger,
}: {
  startX: number;
  simulating: boolean;
  onSettled: (slotIndex: number) => void;
  bid: number;
  kickTrigger: number;
}) {
  const bodyRef = useRef<RapierRigidBody>(null);
  const settledRef = useRef(false);
  const dropTimeRef = useRef(Date.now());
  const prevKickRef = useRef(0);
  const { scene } = useGLTF("/models/rat.glb");
  const cloned = useMemo(() => scene.clone(), [scene]);

  const initialVel = useMemo(
    (): [number, number, number] => [
      (Math.random() - 0.5) * 0.55,
      -0.35 - Math.random() * 0.2,
      0,
    ],
    [],
  );

  useEffect(() => {
    settledRef.current = false;
    dropTimeRef.current = Date.now();
    if (!bodyRef.current) return;
    bodyRef.current.setTranslation({ x: startX, y: DROP_Y, z: PLANE_Z }, true);
    bodyRef.current.setLinvel(
      { x: initialVel[0], y: initialVel[1], z: 0 },
      true,
    );
    bodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
  }, [startX, initialVel]);

  useEffect(() => {
    if (kickTrigger === 0 || kickTrigger === prevKickRef.current) return;
    prevKickRef.current = kickTrigger;
    if (!bodyRef.current || settledRef.current) return;
    const vx = (Math.random() - 0.5) * 6;
    const vy = -(3 + Math.random() * 4);
    const vz = (Math.random() - 0.5) * 8;
    bodyRef.current.setLinvel({ x: vx, y: vy, z: 0 }, true);
    bodyRef.current.setAngvel({ x: 0, y: 0, z: vz }, true);
  }, [kickTrigger]);

  useFrame(() => {
    if (!bodyRef.current) return;

    if (!simulating) {
      if (settledRef.current) return;
      bodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      bodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
      return;
    }

    if (settledRef.current) return;

    const t = bodyRef.current.translation();
    const v = bodyRef.current.linvel();

    if (Math.abs(t.z) > 0.001 || Math.abs(v.z) > 0.001) {
      bodyRef.current.setTranslation({ x: t.x, y: t.y, z: PLANE_Z }, true);
      bodyRef.current.setLinvel({ x: v.x, y: v.y, z: 0 }, true);
    }

    const speed = Math.hypot(v.x, v.y);
    const elapsed = Date.now() - dropTimeRef.current;

    if ((t.y < SETTLE_Y && speed < 0.35) || elapsed > 30_000) {
      settledRef.current = true;
      bodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      bodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
      onSettled(slotIndexFromX(t.x, bid));
    }
  });

  return (
    <RigidBody
      ref={bodyRef}
      colliders={false}
      ccd
      canSleep={false}
      restitution={0.62}
      friction={0.28}
      linearDamping={0.08}
      angularDamping={0.4}
      position={[startX, DROP_Y, PLANE_Z]}
      enabledTranslations={[true, true, false]}
      enabledRotations={[false, false, true]}
    >
      <BallCollider args={[BALL_RADIUS]} />
      <group scale={0.32} rotation={[0, Math.PI / 5, 0]}>
        <primitive object={cloned} />
      </group>
    </RigidBody>
  );
}

const RAT_SPREAD = 0.35;

function PachinkoWorld({
  dropKey,
  startX,
  showRat,
  simulating,
  onSettled,
  bid,
  kickTrigger,
  ratAmount,
  countdown,
  onCountdownEnd,
  showRiskGate,
  riskGateChoice,
  settleTrigger,
}: {
  dropKey: number;
  startX: number;
  showRat: boolean;
  simulating: boolean;
  onSettled: (slotIndexes: number[]) => void;
  bid: number;
  kickTrigger: number;
  ratAmount: number;
  countdown: number | null;
  onCountdownEnd: () => void;
  showRiskGate: boolean;
  riskGateChoice: RiskGateChoice;
  settleTrigger: number;
}) {
  const settledRef = useRef<number[]>([]);
  const settledCountRef = useRef(0);
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;

  useEffect(() => {
    settledRef.current = [];
    settledCountRef.current = 0;
  }, [dropKey]);

  const handleSingleSettled = useCallback(
    (slotIndex: number) => {
      settledRef.current.push(slotIndex);
      settledCountRef.current += 1;
      if (settledCountRef.current === ratAmount) {
        onSettledRef.current(settledRef.current);
      }
    },
    [ratAmount],
  );

  const startPositions = useMemo(() => {
    if (ratAmount === 1) return [startX];
    const offsets = Array.from({ length: ratAmount }, (_, i) => {
      const center = (ratAmount - 1) / 2;
      return (i - center) * RAT_SPREAD;
    });
    return offsets.map((o) => startX + o);
  }, [startX, ratAmount]);

  // Countdown
  const countdownRef = useRef(countdown);
  countdownRef.current = countdown;
  const onCountdownEndRef = useRef(onCountdownEnd);
  onCountdownEndRef.current = onCountdownEnd;

  useEffect(() => {
    if (countdown === null || countdown <= 0) return;
    const timer = setTimeout(() => {
      onCountdownEndRef.current();
    }, 800);
    return () => clearTimeout(timer);
  }, [countdown]);

  return (
    <>
      <BoardWalls bid={bid} />
      <PegField />
      <TopChute startX={startX} />
      <RiskGateDoors show={showRiskGate} choice={riskGateChoice} />
      {countdown !== null && countdown > 0 && (
        <Html center position={[0, BOARD_CENTER_Y + 2, 0]} distanceFactor={12}>
          <span
            style={{
              color: "#f6c177",
              fontSize: "30px",
              fontWeight: 900,
              fontFamily: "monospace",
              textShadow: "0 0 30px #f6c17766, 0 4px 8px rgba(0,0,0,0.9)",
              animation: "none",
            }}
          >
            {countdown}
          </span>
        </Html>
      )}
      {showRat &&
        (countdown === null || countdown <= 0) &&
        startPositions.map((x, i) => (
          <RatBall
            key={`${dropKey}-${i}`}
            startX={x}
            simulating={simulating}
            onSettled={handleSingleSettled}
            bid={bid}
            kickTrigger={kickTrigger}
          />
        ))}
      <WinBurst trigger={settleTrigger} />
    </>
  );
}

function SceneContent({
  dropKey,
  startX,
  showRat,
  simulating,
  highlightIndex,
  onSettled,
  bid,
  kickTrigger,
  ratAmount,
  countdown,
  onCountdownEnd,
  zawaText,
  showRiskGate,
  riskGateChoice,
  settleTrigger,
  shakeIntensity,
}: {
  dropKey: number;
  startX: number;
  showRat: boolean;
  simulating: boolean;
  highlightIndex: number | null;
  onSettled: (slotIndexes: number[]) => void;
  bid: number;
  kickTrigger: number;
  ratAmount: number;
  countdown: number | null;
  onCountdownEnd: () => void;
  zawaText: string;
  showRiskGate: boolean;
  riskGateChoice: RiskGateChoice;
  settleTrigger: number;
  shakeIntensity: number;
}) {
  const glowIntensity = simulating ? 0.6 : 0;

  return (
    <>
      <FitOrthoCamera />
      <ShakeController intensity={shakeIntensity} />
      <color attach="background" args={["#191724"]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[0, 12, 6]} intensity={1.1} />
      <directionalLight
        position={[-4, 8, 5]}
        intensity={0.25}
        color="#c4a7e7"
      />
      <directionalLight
        position={[4, -2, 3]}
        intensity={0.15}
        color="#eb6f92"
      />
      <spotLight
        position={[0, 18, 3]}
        angle={0.4}
        penumbra={0.3}
        intensity={0.4}
        color="#e0def4"
      />

      <FramePillars />
      <BoardBackdrop />
      <SlotStrip
        highlightIndex={highlightIndex}
        bid={bid}
        glowIntensity={glowIntensity}
      />

      {zawaText && (
        <Html
          position={[0, 18, 0]}
          center
          distanceFactor={20}
          style={{ pointerEvents: "none" }}
        >
          <span
            style={{
              color: "#eb6f9244",
              fontSize: "14px",
              fontWeight: 700,
              fontFamily: "monospace",
              letterSpacing: "8px",
              whiteSpace: "nowrap",
              textShadow: "0 0 20px #eb6f9233",
            }}
          >
            {zawaText}
          </span>
        </Html>
      )}

      <Suspense fallback={null}>
        <Physics gravity={[0, -11, 0]} timeStep={1 / 60}>
          <PachinkoWorld
            dropKey={dropKey}
            startX={startX}
            showRat={showRat}
            simulating={simulating}
            onSettled={onSettled}
            bid={bid}
            kickTrigger={kickTrigger}
            ratAmount={ratAmount}
            countdown={countdown}
            onCountdownEnd={onCountdownEnd}
            showRiskGate={showRiskGate}
            riskGateChoice={riskGateChoice}
            settleTrigger={settleTrigger}
          />
        </Physics>
      </Suspense>
    </>
  );
}

function PachinkoScene({
  dropKey,
  startX,
  showRat,
  simulating,
  highlightIndex,
  onSettled,
  bid,
  kickTrigger,
  ratAmount,
  countdown,
  onCountdownEnd,
  zawaText,
  showRiskGate,
  riskGateChoice,
  settleTrigger,
  shakeIntensity,
}: {
  dropKey: number;
  startX: number;
  showRat: boolean;
  simulating: boolean;
  highlightIndex: number | null;
  onSettled: (slotIndexes: number[]) => void;
  bid: number;
  kickTrigger: number;
  ratAmount: number;
  countdown: number | null;
  onCountdownEnd: () => void;
  zawaText: string;
  showRiskGate: boolean;
  riskGateChoice: RiskGateChoice;
  settleTrigger: number;
  shakeIntensity: number;
}) {
  return (
    <Canvas
      orthographic
      camera={{
        position: [0, BOARD_CENTER_Y, 10],
        zoom: 1.1,
        near: 0.1,
        far: 30,
      }}
      className="h-full w-full"
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
    >
      <SceneContent
        dropKey={dropKey}
        startX={startX}
        showRat={showRat}
        simulating={simulating}
        highlightIndex={highlightIndex}
        onSettled={onSettled}
        bid={bid}
        kickTrigger={kickTrigger}
        ratAmount={ratAmount}
        countdown={countdown}
        onCountdownEnd={onCountdownEnd}
        zawaText={zawaText}
        showRiskGate={showRiskGate}
        riskGateChoice={riskGateChoice}
        settleTrigger={settleTrigger}
        shakeIntensity={shakeIntensity}
      />
    </Canvas>
  );
}

export default PachinkoScene;
