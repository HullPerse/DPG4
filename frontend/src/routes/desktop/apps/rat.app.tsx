import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, OrbitControls, useGLTF } from "@react-three/drei";
import { Suspense, useMemo, useRef, useState } from "react";
import * as THREE from "three";

useGLTF.preload("/rat.glb");

function RatModel({ spinning }: { spinning: boolean }) {
  const { scene } = useGLTF("/rat.glb");
  const groupRef = useRef<THREE.Group>(null);
  const cloned = useMemo(() => scene.clone(), [scene]);

  useFrame((_, delta) => {
    if (!groupRef.current || !spinning) return;
    groupRef.current.rotation.y += delta * 0.9;
  });

  return (
    <group ref={groupRef} scale={1.15}>
      <primitive object={cloned} />
    </group>
  );
}

function SceneContent() {
  const [isOrbiting, setIsOrbiting] = useState(false);

  return (
    <>
      <OrbitControls
        enablePan={false}
        onStart={() => setIsOrbiting(true)}
        onEnd={() => setIsOrbiting(false)}
      />
      <Environment preset="city" />
      <color attach="background" args={["#191724"]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 6, 4]} intensity={1.6} color="#f6c177" />
      <directionalLight position={[-4, 3, -3]} intensity={0.6} color="#c4a7e7" />
      <directionalLight position={[-2, -1, 6]} intensity={0.4} color="#eb6f92" />
      <directionalLight position={[0, -4, -4]} intensity={0.25} color="#31748f" />
      <group position={[0, -0.8, 0]}>
        <Suspense fallback={null}>
          <RatModel spinning={!isOrbiting} />
        </Suspense>
      </group>
    </>
  );
}

function RatApp() {
  return (
    <Canvas
      camera={{ position: [3.5, 2, 5], fov: 42 }}
      className="h-full w-full"
      gl={{ antialias: true, alpha: true }}
    >
      <Suspense fallback={null}>
        <SceneContent />
      </Suspense>
    </Canvas>
  );
}

export default RatApp;
