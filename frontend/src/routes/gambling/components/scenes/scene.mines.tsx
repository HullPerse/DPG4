import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { useRef, useMemo, useState, useCallback, useEffect, memo } from "react";
import * as THREE from "three";

const GRID = 5;
const TILE_SIZE = 0.85;
const GAP = 0.08;
const BOARD_SIZE = GRID * (TILE_SIZE + GAP) - GAP;
const HALF_BOARD = BOARD_SIZE / 2;
const TILE_HEIGHT = 0.12;

type TileState = "hidden" | "safe" | "mine";

interface TileData {
  row: number;
  col: number;
  x: number;
  z: number;
  state: TileState;
}

function Tile({
  data,
  onReveal,
  disabled,
}: {
  data: TileData;
  onReveal: (row: number, col: number) => void;
  disabled: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const flipProgress = useRef(data.state !== "hidden" ? 1 : 0);
  const [shown, setShown] = useState(data.state !== "hidden");
  const targetProgress = data.state !== "hidden" ? 1 : 0;

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const speed = delta * 6;
    if (flipProgress.current < targetProgress) {
      flipProgress.current = Math.min(1, flipProgress.current + speed);
      const scaleY = 1 - flipProgress.current * 0.85;
      meshRef.current.scale.y = Math.max(0.15, scaleY);
      if (flipProgress.current >= 1) setShown(true);
    }
  });

  useEffect(() => {
    if (data.state !== "hidden") {
      flipProgress.current = 0;
      setShown(false);
    }
  }, [data.state]);

  const color = shown
    ? data.state === "mine"
      ? "#eb6f92"
      : "#7fda72"
    : "#2a273f";
  const emissive = shown
    ? data.state === "mine"
      ? "#eb6f92"
      : "#7fda72"
    : "#000000";
  const emissiveIntensity = shown ? 0.3 : 0;

  const handleClick = useCallback(() => {
    if (data.state === "hidden" && !disabled) {
      onReveal(data.row, data.col);
    }
  }, [data.state, disabled, data.row, data.col, onReveal]);

  return (
    <mesh
      ref={meshRef}
      position={[data.x, 0, data.z]}
      onClick={handleClick}
      onPointerOver={(e) => {
        if (data.state === "hidden" && !disabled) {
          (e.object as THREE.Mesh).material = new THREE.MeshStandardMaterial({
            color: "#3b3754",
            roughness: 0.6,
          });
        }
      }}
      onPointerOut={(e) => {
        if (data.state === "hidden") {
          (e.object as THREE.Mesh).material = new THREE.MeshStandardMaterial({
            color,
            roughness: 0.7,
            emissive,
            emissiveIntensity,
          });
        }
      }}
    >
      <boxGeometry args={[TILE_SIZE, TILE_HEIGHT, TILE_SIZE]} />
      <meshStandardMaterial
        color={color}
        roughness={0.7}
        metalness={0.1}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
      />
    </mesh>
  );
}

function MinesBoard({
  revealed,
  minePositions,
  phase,
  onReveal,
  disabled,
}: {
  revealed: boolean[][];
  minePositions?: [number, number][];
  phase: string;
  onReveal: (row: number, col: number) => void;
  disabled: boolean;
}) {
  const tiles = useMemo(() => {
    const result: TileData[] = [];
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const x = -HALF_BOARD + c * (TILE_SIZE + GAP) + TILE_SIZE / 2;
        const z = -HALF_BOARD + r * (TILE_SIZE + GAP) + TILE_SIZE / 2;
        const isRevealed = revealed?.[r]?.[c] ?? false;
        const isMine =
          isRevealed &&
          minePositions?.some(([mr, mc]) => mr === r && mc === c);
        const state: TileState = isRevealed
          ? isMine
            ? "mine"
            : "safe"
          : "hidden";
        result.push({ row: r, col: c, x, z, state });
      }
    }
    return result;
  }, [revealed, minePositions]);

  const gameOver = phase === "won" || phase === "lost";

  return (
    <group position={[0, 0.5, 0]}>
      {tiles.map((tile) => (
        <Tile
          key={`${tile.row}-${tile.col}`}
          data={tile}
          onReveal={onReveal}
          disabled={disabled || gameOver || tile.state !== "hidden"}
        />
      ))}
    </group>
  );
}

function BoardBase() {
  return (
    <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[BOARD_SIZE + 0.4, BOARD_SIZE + 0.4]} />
      <meshStandardMaterial color="#1e1d2a" roughness={0.95} />
    </mesh>
  );
}

function SceneContent({
  revealed,
  minePositions,
  phase,
  onReveal,
  disabled,
}: {
  revealed: boolean[][];
  minePositions?: [number, number][];
  phase: string;
  onReveal: (row: number, col: number) => void;
  disabled: boolean;
}) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} />
      <directionalLight position={[-3, 4, -2]} intensity={0.3} color="#c4a7e7" />
      <color attach="background" args={["#191724"]} />
      <BoardBase />
      <MinesBoard
        revealed={revealed}
        minePositions={minePositions}
        phase={phase}
        onReveal={onReveal}
        disabled={disabled}
      />
      <ContactShadows
        position={[0, -0.1, 0]}
        opacity={0.4}
        scale={BOARD_SIZE + 1}
        blur={2.5}
        far={1}
      />
    </>
  );
}

function MinesScene({
  revealed,
  minePositions,
  phase,
  onReveal,
  disabled,
  resetKey,
}: {
  revealed: boolean[][];
  minePositions?: [number, number][];
  phase: string;
  onReveal: (row: number, col: number) => void;
  disabled: boolean;
  resetKey: number;
}) {
  return (
    <Canvas
      camera={{
        position: [0, 6, 5],
        fov: 45,
        near: 0.1,
        far: 20,
      }}
      className="h-full w-full"
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
      key={resetKey}
    >
      <SceneContent
        revealed={revealed}
        minePositions={minePositions}
        phase={phase}
        onReveal={onReveal}
        disabled={disabled}
      />
    </Canvas>
  );
}

export default memo(MinesScene);
