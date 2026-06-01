import { Canvas } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import DiceMesh from "../components/mesh.dice";

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
      camera={{ position: [0, 9, 7], fov: 30 }}
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

export default DiceScene;
