import { PCFShadowMap } from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, useGLTF } from "@react-three/drei";
import { useRef, useMemo, Suspense } from "react";
import * as THREE from "three";

useGLTF.preload("/rat.glb");

function RatModel({
  multiplier,
  phase,
  compact = false,
}: {
  multiplier: number;
  phase: string;
  compact?: boolean;
}) {
  const { scene } = useGLTF("/rat.glb");
  const groupRef = useRef<THREE.Group>(null);
  const cloned = useMemo(() => scene.clone(), [scene]);

  const flying = phase === "flying" || phase === "launching";
  const crashed = phase === "crashed";
  const cashed = phase === "cashed";

  const targetY = useMemo(() => {
    if (!flying) return compact ? -0.3 : 0;
    return Math.min((multiplier - 1) * (compact ? 0.35 : 0.55), compact ? 2.5 : 4);
  }, [multiplier, flying, compact]);

  const targetRotZ = useMemo(() => {
    if (crashed) return Math.PI / 4;
    if (cashed) return -0.15;
    if (flying) return -0.35 + Math.min(multiplier * 0.02, 0.15);
    return 0;
  }, [flying, crashed, cashed, multiplier]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const g = groupRef.current;

    g.position.y += (targetY - g.position.y) * delta * 4;

    if (flying) {
      g.rotation.y += delta * 0.65;
      g.rotation.z += (-0.35 - g.rotation.z) * delta * 2;
      g.rotation.x = Math.sin(state.clock.elapsedTime * 3) * 0.04;
      g.position.x = Math.sin(state.clock.elapsedTime * 2.5) * 0.05;
    } else if (crashed) {
      g.rotation.z += (Math.PI / 3 - g.rotation.z) * delta * 6;
      g.position.y += (-1.2 - g.position.y) * delta * 4;
    } else {
      g.rotation.z += (targetRotZ - g.rotation.z) * delta * 4;
      g.rotation.x *= 1 - delta * 4;
      g.position.x *= 1 - delta * 4;
    }

    const baseScale = compact ? 0.82 : 1.15;
    const grow = flying ? Math.min((multiplier - 1) * 0.04, 0.2) : 0;
    const s = baseScale + grow;
    g.scale.lerp(new THREE.Vector3(s, s, s), delta * 5);
  });

  return (
    <group ref={groupRef} rotation={[0, Math.PI / 6, 0]}>
      <primitive object={cloned} />
    </group>
  );
}

function CheeseTrail({ multiplier, active }: { multiplier: number; active: boolean }) {
  const count = 24;
  const particlesRef = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 0.4;
      pos[i * 3 + 1] = -0.8 - Math.random() * 1.5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
    }
    return pos;
  }, []);

  useFrame((_, delta) => {
    if (!particlesRef.current || !active) return;
    const arr = particlesRef.current.geometry.attributes.position.array as Float32Array;
    const speed = 1.5 + multiplier * 0.35;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] -= speed * delta;
      if (arr[i * 3 + 1] < -3) {
        arr[i * 3 + 1] = -0.5;
        arr[i * 3] = (Math.random() - 0.5) * 0.6;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 0.6;
      }
    }
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });

  if (!active) return null;

  return (
    <points ref={particlesRef} position={[0, -0.2, 0]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#f6c177"
        size={0.06}
        transparent
        opacity={0.75}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function StarField() {
  const count = 80;
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 14;
      pos[i * 3 + 1] = Math.random() * 10 - 1;
      pos[i * 3 + 2] = -2 - Math.random() * 6;
    }
    return pos;
  }, []);

  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.position.y -= delta * 0.4;
    if (ref.current.position.y < -1) ref.current.position.y = 0;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#908caa" size={0.04} transparent opacity={0.5} />
    </points>
  );
}

function SceneContent({
  multiplier,
  phase,
  compact,
}: {
  multiplier: number;
  phase: string;
  compact?: boolean;
}) {
  const flying = phase === "flying" || phase === "launching";

  return (
    <>
      {!compact && <color attach="background" args={["#191724"]} />}
      {!compact && <StarField />}
      <ambientLight intensity={0.45} />
      <directionalLight castShadow position={[5, 8, 4]} intensity={1.2} shadow-mapSize={[256, 256]} />
      <directionalLight position={[-3, 2, -2]} intensity={0.4} color="#c4a7e7" />
      <pointLight position={[0, 1, 4]} intensity={0.5} color="#f6c177" />
      <group position={[0, compact ? -0.5 : -0.8, 0]}>
        <RatModel multiplier={multiplier} phase={phase} compact={compact} />
        <CheeseTrail multiplier={multiplier} active={flying} />
      </group>
      {!compact && (
        <>
          <ContactShadows position={[0, -1.2, 0]} opacity={0.35} scale={8} blur={2} far={3} />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]} receiveShadow>
            <planeGeometry args={[12, 12]} />
            <meshStandardMaterial color="#232136" roughness={0.9} />
          </mesh>
        </>
      )}
    </>
  );
}

export function RatMarker({
  multiplier,
  phase,
  size = 120,
}: {
  multiplier: number;
  phase: string;
  size?: number;
}) {
  return (
    <div style={{ width: size, height: size, pointerEvents: "none", background: "transparent" }}>
      <Canvas
        shadows={false}
        camera={{ position: [2.2, 1.5, 3.9], fov: 32, near: 0.1, far: 50 }}
        className="h-full w-full"
        style={{ background: "transparent" }}
        gl={{ antialias: true, alpha: true, premultipliedAlpha: false }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
      >
        <Suspense fallback={null}>
          <SceneContent multiplier={multiplier} phase={phase} compact />
        </Suspense>
      </Canvas>
    </div>
  );
}

function RocketScene({
  multiplier,
  phase,
}: {
  multiplier: number;
  crashPoint: number;
  phase: string;
}) {
  return (
    <Canvas
      shadows={{ type: PCFShadowMap }}
      camera={{ position: [3.5, 2, 5], fov: 42 }}
      className="h-full w-full"
      gl={{ antialias: true, alpha: true }}
    >
      <Suspense fallback={null}>
        <SceneContent multiplier={multiplier} phase={phase} />
      </Suspense>
    </Canvas>
  );
}

export default RocketScene;
