import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Html } from "@react-three/drei";
import { useRef, useMemo, useEffect, memo } from "react";
import * as THREE from "three";
import { WHEEL_SEGMENTS, WHEEL_COLORS } from "@/lib/gambling/gamble.constants";
import { computeSpinEndAngle, WHEEL_SEGMENT_ANGLE } from "@/lib/gambling/wheel.utils";

const SEGMENTS = WHEEL_SEGMENTS.length;
const RADIUS = 2.5;
const RING_INNER = 0.4;
const POINTER_HEIGHT = 0.3;

function WheelSegment({
  index,
  color,
}: {
  index: number;
  color: string;
}) {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    const startAngle = index * WHEEL_SEGMENT_ANGLE;
    const endAngle = (index + 1) * WHEEL_SEGMENT_ANGLE;

    s.moveTo(0, 0);
    s.absarc(0, 0, RADIUS, startAngle, endAngle, false);
    s.lineTo(0, 0);
    return s;
  }, [index]);

  return (
    <mesh position={[0, 0, 0]}>
      <shapeGeometry args={[shape]} />
      <meshStandardMaterial
        color={color}
        side={THREE.DoubleSide}
        roughness={0.4}
        metalness={0.15}
        emissive={color}
        emissiveIntensity={0.08}
      />
    </mesh>
  );
}

function SegmentLabel({
  index,
  text,
}: {
  index: number;
  text: string;
}) {
  const midAngle = index * WHEEL_SEGMENT_ANGLE + WHEEL_SEGMENT_ANGLE / 2;
  const labelRadius = RADIUS * 0.65;
  const x = Math.cos(midAngle) * labelRadius;
  const y = Math.sin(midAngle) * labelRadius;

  return (
    <Html
      position={[x, y, 0.01]}
      center
      style={{
        pointerEvents: "none",
        userSelect: "none",
        color: "#fff",
        fontSize: "10px",
        fontWeight: 800,
        fontFamily: "monospace",
        textShadow: "0 1px 3px rgba(0,0,0,0.9)",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </Html>
  );
}

function OuterRing() {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.absarc(0, 0, RADIUS + 0.08, 0, Math.PI * 2, false);
    s.absarc(0, 0, RADIUS - 0.04, 0, Math.PI * 2, true);
    return s;
  }, []);

  return (
    <mesh position={[0, 0, -0.01]}>
      <shapeGeometry args={[shape]} />
      <meshStandardMaterial color="#524f67" roughness={0.6} metalness={0.3} />
    </mesh>
  );
}

function CenterHub() {
  return (
    <mesh position={[0, 0, 0.01]}>
      <circleGeometry args={[RING_INNER + 0.05, 24]} />
      <meshStandardMaterial
        color="#908caa"
        roughness={0.4}
        metalness={0.5}
      />
    </mesh>
  );
}

function Pointer() {
  return (
    <group position={[0, RADIUS + POINTER_HEIGHT / 2 + 0.15, 0.02]}>
      <mesh>
        <coneGeometry args={[0.15, POINTER_HEIGHT, 3]} />
        <meshStandardMaterial color="#f6c177" emissive="#f6c177" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

function WheelContent({
  spinning,
  targetSegment,
  onSpinComplete,
}: {
  spinning: boolean;
  targetSegment: number | null;
  onSpinComplete: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const spinState = useRef({
    startAngle: 0,
    endAngle: 0,
    startTime: 0,
    duration: 0,
    isSpinning: false,
  });
  const completeCalled = useRef(false);

  useEffect(() => {
    if (!spinning || targetSegment === null || !groupRef.current) return;

    completeCalled.current = false;
    const duration = 3000 + Math.random() * 2000;
    const fullRotations = 5 + Math.floor(Math.random() * 3);
    const endAngle = computeSpinEndAngle(targetSegment, fullRotations);

    spinState.current = {
      startAngle: groupRef.current.rotation.z,
      endAngle,
      startTime: Date.now(),
      duration,
      isSpinning: true,
    };
  }, [spinning, targetSegment]);

  useFrame(() => {
    if (!groupRef.current || !spinState.current.isSpinning) return;

    const { startAngle, endAngle, startTime, duration } = spinState.current;
    const elapsed = Date.now() - startTime;
    const t = Math.min(1, elapsed / duration);

    const eased = 1 - Math.pow(1 - t, 3);
    const currentAngle = startAngle + (endAngle - startAngle) * eased;
    groupRef.current.rotation.z = currentAngle;

    if (t >= 1 && !completeCalled.current) {
      spinState.current.isSpinning = false;
      completeCalled.current = true;
      onSpinComplete();
    }
  });

  return (
    <group ref={groupRef}>
      <OuterRing />
      {Array.from({ length: SEGMENTS }, (_, i) => (
        <WheelSegment
          key={i}
          index={i}
          color={WHEEL_COLORS[i]}
        />
      ))}
      {Array.from({ length: SEGMENTS }, (_, i) => (
        <SegmentLabel
          key={`lbl-${i}`}
          index={i}
          text={`${WHEEL_SEGMENTS[i].mult}x`}
        />
      ))}
      <CenterHub />
    </group>
  );
}

function SceneContent({
  spinning,
  targetSegment,
  onSpinComplete,
}: {
  spinning: boolean;
  targetSegment: number | null;
  onSpinComplete: () => void;
}) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 5, 4]} intensity={1} />
      <directionalLight position={[-2, 3, 2]} intensity={0.3} color="#c4a7e7" />
      <color attach="background" args={["#191724"]} />
      <WheelContent
        spinning={spinning}
        targetSegment={targetSegment}
        onSpinComplete={onSpinComplete}
      />
      <Pointer />
      <ContactShadows
        position={[0, -RADIUS - 0.3, 0]}
        opacity={0.35}
        scale={RADIUS * 2.5}
        blur={3}
        far={RADIUS + 0.5}
      />
    </>
  );
}

function WheelScene({
  spinning,
  targetSegment,
  onSpinComplete,
}: {
  spinning: boolean;
  targetSegment: number | null;
  onSpinComplete: () => void;
}) {
  return (
    <Canvas
      camera={{
        position: [0, 0, 4.5],
        fov: 45,
        near: 0.1,
        far: 10,
      }}
      className="h-full w-full"
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
    >
      <SceneContent
        spinning={spinning}
        targetSegment={targetSegment}
        onSpinComplete={onSpinComplete}
      />
    </Canvas>
  );
}

export default memo(WheelScene);
