import { PCFShadowMap } from "three";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Text, Billboard } from "@react-three/drei";
import DiceMesh from "../components/mesh.dice";
import { DEALER_Z, PLAYER_Z } from "@/lib/gambling/dice.utils";

function DiceScene({
  dealerThrowKey,
  playerThrowKey,
  dealerValues,
  playerValues,
  dealerTarget,
  onDealerSettled,
  onPlayerSettled,
  showDealerLabel,
}: {
  dealerThrowKey: number;
  playerThrowKey: number;
  dealerValues: [number, number, number] | null;
  playerValues: [number, number, number] | null;
  dealerTarget: number | null;
  onDealerSettled: (index: number) => void;
  onPlayerSettled: (index: number) => void;
  showDealerLabel?: boolean;
}) {
  return (
    <Canvas
      shadows={{ type: PCFShadowMap }}
      camera={{ position: [0, 20, 8.5], fov: 28 }}
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
        {/* Dealer row (back) */}
        {showDealerLabel && (
          <Billboard>
            <Text
              position={[-5.0, 2.5, DEALER_Z + 2]}
              fontSize={0.45}
              color="#908caa"
              anchorX="left"
            >
              Дилер
            </Text>
          </Billboard>
        )}
        {dealerTarget != null && showDealerLabel && (
          <Billboard>
            <Text
              position={[-5.0, 2, DEALER_Z + 2]}
              fontSize={0.35}
              color="#f6c177"
              anchorX="left"
            >
              Цель: {dealerTarget}
            </Text>
          </Billboard>
        )}
        {([0, 1, 2] as const).map((i) => (
          <DiceMesh
            key={`d-${i}`}
            index={i}
            rowZ={DEALER_Z}
            throwKey={dealerThrowKey}
            targetValue={dealerValues?.[i] ?? 1}
            onSettled={() => onDealerSettled(i)}
          />
        ))}

        {([0, 1, 2] as const).map((i) => (
          <DiceMesh
            key={`p-${i}`}
            index={i}
            rowZ={PLAYER_Z}
            throwKey={playerThrowKey}
            targetValue={playerValues?.[i] ?? 1}
            onSettled={() => onPlayerSettled(i)}
          />
        ))}
      </group>

      <ContactShadows
        position={[0, -1.1, 0]}
        opacity={0.45}
        scale={14}
        blur={2.5}
        far={4}
      />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -1.1, 0]}
        receiveShadow
      >
        <planeGeometry args={[22, 22]} />
        <shadowMaterial opacity={0.25} />
      </mesh>
    </Canvas>
  );
}

export default DiceScene;
