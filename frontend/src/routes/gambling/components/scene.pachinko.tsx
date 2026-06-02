import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Physics,
  RigidBody,
  BallCollider,
  CuboidCollider,
  type RapierRigidBody,
} from "@react-three/rapier";
import { Html, useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  BOARD_WIDTH,
  PACHINKO_SLOT_COUNT,
  PACHINKO_SLOT_MULTIPLIERS,
  SLOT_WIDTH,
  slotCenterX,
  slotColor,
  slotIndexFromX,
} from "@/lib/gambling/pachinko.utils";

useGLTF.preload("/rat.glb");

/** Physics & slot math share this width — do not change without updating utils */
const BOARD_HALF = BOARD_WIDTH / 2;
const BOARD_TOP = 17.2;
const BOARD_HEIGHT = BOARD_TOP;
const BOARD_CENTER_Y = BOARD_HEIGHT / 2;
const DROP_Y = 16.4;
const SETTLE_Y = 1.35;
const PLANE_Z = 0;

const PEG_ROWS = 11;
const PEG_COLS = 7;
const PEG_RADIUS = 0.13;
const BALL_RADIUS = 0.2;
const LANE_HALF_Z = 0.28;

/** Tight crop — board fills most of the viewport */
const VIEW_PAD_X = 0.45;
const VIEW_PAD_TOP = 0.55;
const VIEW_PAD_BOTTOM = 0.15;

function buildPegPositions(): [number, number][] {
  const pegs: [number, number][] = [];
  const rowSpan = 10.8;
  const topY = 15.2;
  const stepY = rowSpan / (PEG_ROWS - 1);
  const usable = BOARD_WIDTH - 1.2;
  const stepX = usable / (PEG_COLS - 1);

  for (let row = 0; row < PEG_ROWS; row++) {
    const y = topY - row * stepY;
    const offset = row % 2 === 0 ? 0 : SLOT_WIDTH * 0.5;

    for (let col = 0; col < PEG_COLS; col++) {
      const x = -usable / 2 + col * stepX + offset;
      if (Math.abs(x) <= BOARD_HALF - 0.35) pegs.push([x, y]);
    }
  }

  return pegs;
}

const PEG_POSITIONS = buildPegPositions();

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

function BoardBackdrop() {
  return (
    <group position={[0, BOARD_CENTER_Y, -0.12]}>
      <mesh receiveShadow>
        <planeGeometry args={[BOARD_WIDTH + 0.5, BOARD_HEIGHT + 0.35]} />
        <meshStandardMaterial color="#1e1d2a" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[BOARD_WIDTH + 0.22, BOARD_HEIGHT + 0.08]} />
        <meshStandardMaterial color="#26233a" roughness={0.9} />
      </mesh>
    </group>
  );
}

function SlotStrip({ highlightIndex }: { highlightIndex: number | null }) {
  return (
    <group position={[0, 0.38, 0.02]}>
      {PACHINKO_SLOT_MULTIPLIERS.map((mult, i) => {
        const x = slotCenterX(i);
        const lit = highlightIndex === i;
        const color = slotColor(mult);
        const label = `${mult}x`;
        return (
          <group key={i} position={[x, 0, 0]}>
            <mesh>
              <boxGeometry args={[SLOT_WIDTH * 0.88, 0.62, 0.08]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={lit ? 0.95 : 0.18}
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

/** Sphere pegs — reliable Rapier contacts in a flat lane */
function PegField() {
  return (
    <>
      {PEG_POSITIONS.map(([x, y], i) => (
        <RigidBody
          key={i}
          type="fixed"
          colliders={false}
          position={[x, y, PLANE_Z]}
          friction={0.2}
          restitution={0.72}
        >
          <BallCollider args={[PEG_RADIUS]} />
          <mesh castShadow>
            <sphereGeometry args={[PEG_RADIUS, 10, 10]} />
            <meshStandardMaterial
              color="#b4b0c8"
              metalness={0.5}
              roughness={0.35}
            />
          </mesh>
        </RigidBody>
      ))}
    </>
  );
}

function BoardWalls() {
  return (
    <>
      {/* Side walls */}
      <RigidBody
        type="fixed"
        colliders={false}
        position={[-BOARD_HALF - 0.12, BOARD_CENTER_Y, PLANE_Z]}
      >
        <CuboidCollider args={[0.12, BOARD_HEIGHT / 2 + 0.4, LANE_HALF_Z]} />
      </RigidBody>
      <RigidBody
        type="fixed"
        colliders={false}
        position={[BOARD_HALF + 0.12, BOARD_CENTER_Y, PLANE_Z]}
      >
        <CuboidCollider args={[0.12, BOARD_HEIGHT / 2 + 0.4, LANE_HALF_Z]} />
      </RigidBody>
      {/* Top chute */}
      <RigidBody
        type="fixed"
        colliders={false}
        position={[0, BOARD_TOP + 0.1, PLANE_Z]}
      >
        <CuboidCollider args={[BOARD_HALF + 0.15, 0.14, LANE_HALF_Z]} />
      </RigidBody>
      {/* Z lane — keeps ball on the board plane */}
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
      {/* Slot dividers */}
      {Array.from({ length: PACHINKO_SLOT_COUNT - 1 }, (_, i) => {
        const x = -BOARD_HALF + (i + 1) * SLOT_WIDTH;
        return (
          <RigidBody
            key={i}
            type="fixed"
            colliders={false}
            position={[x, 0.72, PLANE_Z]}
          >
            <CuboidCollider args={[0.03, 0.72, LANE_HALF_Z * 0.85]} />
          </RigidBody>
        );
      })}
      {/* Floor */}
      <RigidBody type="fixed" colliders={false} position={[0, -0.08, PLANE_Z]}>
        <CuboidCollider args={[BOARD_HALF + 0.15, 0.08, LANE_HALF_Z]} />
      </RigidBody>
    </>
  );
}

function RatBall({
  startX,
  simulating,
  onSettled,
}: {
  startX: number;
  simulating: boolean;
  onSettled: (slotIndex: number) => void;
}) {
  const bodyRef = useRef<RapierRigidBody>(null);
  const settledRef = useRef(false);
  const dropTimeRef = useRef(Date.now());
  const { scene } = useGLTF("/rat.glb");
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

    if ((t.y < SETTLE_Y && speed < 0.35) || elapsed > 28_000) {
      settledRef.current = true;
      bodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      bodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
      onSettled(slotIndexFromX(t.x));
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
      <group scale={0.28} rotation={[0, Math.PI / 5, 0]}>
        <primitive object={cloned} />
      </group>
    </RigidBody>
  );
}

function PachinkoWorld({
  dropKey,
  startX,
  showRat,
  simulating,
  onSettled,
}: {
  dropKey: number;
  startX: number;
  showRat: boolean;
  simulating: boolean;
  onSettled: (slotIndex: number) => void;
}) {
  return (
    <>
      <BoardWalls />
      <PegField />
      {showRat && (
        <RatBall
          key={dropKey}
          startX={startX}
          simulating={simulating}
          onSettled={onSettled}
        />
      )}
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
}: {
  dropKey: number;
  startX: number;
  showRat: boolean;
  simulating: boolean;
  highlightIndex: number | null;
  onSettled: (slotIndex: number) => void;
}) {
  return (
    <>
      <FitOrthoCamera />
      <color attach="background" args={["#191724"]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[0, 10, 6]} intensity={0.95} />
      <directionalLight position={[-3, 6, 4]} intensity={0.3} color="#c4a7e7" />

      <BoardBackdrop />
      <SlotStrip highlightIndex={highlightIndex} />

      <Suspense fallback={null}>
        <Physics gravity={[0, -11, 0]} timeStep={1 / 60}>
          <PachinkoWorld
            dropKey={dropKey}
            startX={startX}
            showRat={showRat}
            simulating={simulating}
            onSettled={onSettled}
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
}: {
  dropKey: number;
  startX: number;
  showRat: boolean;
  simulating: boolean;
  highlightIndex: number | null;
  onSettled: (slotIndex: number) => void;
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
      />
    </Canvas>
  );
}

export default PachinkoScene;
