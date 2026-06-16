import { PCFSoftShadowMap, RingGeometry, MeshStandardMaterial } from "three";
import { Canvas } from "@react-three/fiber";
import DiceMesh from "../mesh/mesh.dice";
import { DEALER_Z, PLAYER_Z } from "@/lib/gambling/dice.utils";
import { useMemo } from "react";

function Bowl() {
  const geo = useMemo(() => new RingGeometry(4.2, 6.2, 64), []);
  const mat = useMemo(
    () =>
      new MeshStandardMaterial({
        color: "#0a0a14",
        roughness: 0.9,
        metalness: 0.0,
        side: 2,
        transparent: true,
        opacity: 0.5,
      }),
    [],
  );
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.05, 0]} geometry={geo} material={mat} />;
}

function DiceScene({
  dealerThrowKey,
  playerThrowKey,
  dealerValues,
  playerValues,
  onDealerSettled,
  onPlayerSettled,
  playerDiceActive,
  dealerBroken,
  dealerBrokenDieIndex,
  playerBroken,
  playerBrokenDieIndex,
}: {
  dealerThrowKey: number;
  playerThrowKey: number;
  dealerValues: [number, number, number] | null;
  playerValues: [number, number, number] | null;
  onDealerSettled: (index: number, throwKey: number) => void;
  onPlayerSettled: (index: number, throwKey: number) => void;
  playerDiceActive: boolean;
  dealerBroken?: boolean;
  dealerBrokenDieIndex?: number;
  playerBroken?: boolean;
  playerBrokenDieIndex?: number;
}) {
  return (
    <Canvas
      shadows={{ type: PCFSoftShadowMap }}
      camera={{ position: [0, 22, 9], fov: 26 }}
      className="h-full w-full"
      gl={{ antialias: true, alpha: true }}
    >
      <color attach="background" args={["#0a0a10"]} />

      <ambientLight intensity={0.3} />
      <directionalLight
        castShadow
        position={[6, 12, 6]}
        intensity={0.9}
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight
        position={[-6, 4, -4]}
        intensity={0.15}
        color="#8b5cf6"
      />
      <pointLight position={[0, 3, 8]} intensity={0.25} color="#f6c177" />

      <Bowl />

      <group position={[0, -0.2, 0]}>
        {([0, 1, 2] as const).map((i) => (
          <DiceMesh
            key={`d-${i}`}
            index={i}
            rowZ={DEALER_Z}
            throwKey={dealerThrowKey}
            targetValue={dealerValues?.[i] ?? 1}
            onSettled={(idx, key) => onDealerSettled(idx, key)}
            broken={dealerBroken}
            brokenDieIndex={dealerBrokenDieIndex}
          />
        ))}

        {playerDiceActive &&
          ([0, 1, 2] as const).map((i) => (
            <DiceMesh
              key={`p-${i}`}
              index={i}
              rowZ={PLAYER_Z}
              throwKey={playerThrowKey}
              enabled
              targetValue={playerValues?.[i] ?? 1}
              onSettled={(idx, key) => onPlayerSettled(idx, key)}
              broken={playerBroken}
              brokenDieIndex={playerBrokenDieIndex}
            />
          ))}
      </group>

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -1.1, 0]}
        receiveShadow
      >
        <planeGeometry args={[22, 22]} />
        <shadowMaterial opacity={0.35} />
      </mesh>
    </Canvas>
  );
}

export default DiceScene;
