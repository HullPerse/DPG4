import {
  Group,
  Mesh,
  MeshStandardMaterial,
  CanvasTexture,
} from "three";
import {
  REST_Y,
  GRAVITY,
  BROKEN_GRAVITY,
  MIN_AIR_TIME,
  MAX_AIR_TIME,
  MIN_BOUNCES_BEFORE_SETTLE,
  FACE_VALUES,
  TARGET_ROTATION,
  createDiceFaceTexture,
  createInnerFaceTexture,
  lerpAngle,
  createThrowSim,
  createBrokenThrowSim,
  createIdleSim,
  BROKEN_SPLIT_DELAY,
  BROKEN_SPLIT_DURATION,
  BROKEN_HALF_OFFSET,
} from "@/lib/gambling/dice.utils";
import { DiceSim } from "@/types/gamble";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";

function DiceHalf({
  isTop,
  innerTexture,
}: {
  isTop: boolean;
  innerTexture: CanvasTexture;
}) {
  const materials = useMemo(() => {
    const normalMats = FACE_VALUES.map((fv) => {
      const tex = createDiceFaceTexture(fv);
      return new MeshStandardMaterial({
        map: tex,
        roughness: 0.5,
        metalness: 0.05,
      });
    });
    const innerMat = new MeshStandardMaterial({
      map: innerTexture,
      roughness: 1.0,
      metalness: 0.0,
    });
    if (isTop) {
      normalMats[5] = innerMat;
    } else {
      normalMats[4] = innerMat;
    }
    return normalMats;
  }, [isTop, innerTexture]);

  return (
    <mesh castShadow receiveShadow>
      <boxGeometry args={[1.6, 1.6, 1.6]} />
      {materials.map((mat, i) => (
        <primitive key={i} object={mat} attach={`material-${i}`} />
      ))}
    </mesh>
  );
}

function DiceMesh({
  index,
  targetValue,
  throwKey,
  enabled = true,
  onSettled,
  rowZ = 0,
  broken,
  brokenDieIndex,
}: {
  index: number;
  targetValue: number;
  throwKey: number;
  enabled?: boolean;
  onSettled: (index: number, throwKey: number) => void;
  rowZ?: number;
  broken?: boolean;
  brokenDieIndex?: number;
}) {
  const groupRef = useRef<Group>(null);
  const fullCubeRef = useRef<Mesh>(null);
  const topHalfRef = useRef<Group>(null);
  const bottomHalfRef = useRef<Group>(null);
  const simRef = useRef<DiceSim>(createIdleSim(index, rowZ));
  const settledRef = useRef(false);
  const lastThrowKey = useRef(0);
  const homeZRef = useRef(rowZ);

  const splitStartedRef = useRef(false);
  const splitTimeRef = useRef(0);
  const freezeDoneRef = useRef(false);
  const halfOffset = useRef(0);

  const isBrokenDie = !!(broken && brokenDieIndex === index);

  const materials = useMemo(() => {
    return FACE_VALUES.map((faceValue) => {
      const tex = createDiceFaceTexture(faceValue);
      return new MeshStandardMaterial({
        map: tex,
        roughness: 0.5,
        metalness: 0.05,
      });
    });
  }, []);

  const innerTexture = useMemo(() => createInnerFaceTexture(), []);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const dt = Math.min(delta, 0.033);
    const now = state.clock.elapsedTime;

    if (!enabled) {
      if (simRef.current.phase !== "idle") {
        lastThrowKey.current = throwKey;
        settledRef.current = true;
        simRef.current = createIdleSim(index, homeZRef.current);
        group.position.set(
          simRef.current.pos.x,
          simRef.current.pos.y,
          simRef.current.pos.z,
        );
        group.rotation.set(
          simRef.current.rot.x,
          simRef.current.rot.y,
          simRef.current.rot.z,
        );
      }
      if (fullCubeRef.current) fullCubeRef.current.visible = true;
      if (topHalfRef.current) topHalfRef.current.visible = false;
      if (bottomHalfRef.current) bottomHalfRef.current.visible = false;
      return;
    }

    if (throwKey > lastThrowKey.current) {
      lastThrowKey.current = throwKey;
      settledRef.current = false;
      splitStartedRef.current = false;
      freezeDoneRef.current = false;
      halfOffset.current = 0;

      if (!isBrokenDie) {
        for (const mat of materials) {
          mat.emissive = { r: 0, g: 0, b: 0 } as any;
          mat.emissiveIntensity = 0;
        }
      }

      if (fullCubeRef.current) fullCubeRef.current.visible = true;
      if (topHalfRef.current) topHalfRef.current.visible = false;
      if (bottomHalfRef.current) bottomHalfRef.current.visible = false;

      simRef.current = isBrokenDie
        ? createBrokenThrowSim(index, now, homeZRef.current)
        : createThrowSim(index, now, homeZRef.current);
    } else if (throwKey < lastThrowKey.current) {
      lastThrowKey.current = throwKey;
      settledRef.current = true;
      simRef.current = createIdleSim(index, homeZRef.current);
    }

    const sim = simRef.current;

    if (sim.phase === "idle") {
      group.position.set(sim.pos.x, sim.pos.y, sim.pos.z);
      group.rotation.set(sim.rot.x, sim.rot.y, sim.rot.z);
      return;
    }

    if (sim.phase === "flying") {
      sim.vel.y -= (isBrokenDie ? BROKEN_GRAVITY : GRAVITY) * dt;
      sim.pos.x += sim.vel.x * dt;
      sim.pos.y += sim.vel.y * dt;
      sim.pos.z += sim.vel.z * dt;

      sim.rot.x += sim.angVel.x * dt;
      sim.rot.y += sim.angVel.y * dt;
      sim.rot.z += sim.angVel.z * dt;

      const damp = isBrokenDie ? 0.55 : 0.4;
      const dampZ = isBrokenDie ? 0.5 : 0.35;
      const angDamp = isBrokenDie ? 0.65 : 0.8;
      sim.vel.x *= 1 - damp * dt;
      sim.vel.z *= 1 - dampZ * dt;
      sim.angVel.x *= 1 - angDamp * dt;
      sim.angVel.y *= 1 - angDamp * dt;
      sim.angVel.z *= 1 - angDamp * dt;

      if (sim.pos.y <= REST_Y) {
        sim.pos.y = REST_Y;
        sim.bounceCount += 1;

        const restitution = sim.bounceCount > 3 ? 0.15 : 0.38;
        sim.vel.y = Math.abs(sim.vel.y) * restitution;
        sim.vel.x += (Math.random() - 0.5) * 0.6;
        sim.vel.z += (Math.random() - 0.5) * 0.5;

        sim.angVel.x += (Math.random() - 0.5) * 0.8;
        sim.angVel.y += (Math.random() - 0.5) * 0.8;
        sim.angVel.z += (Math.random() - 0.5) * 0.8;

        if (sim.bounceCount > 2) {
          sim.vel.x *= 0.5;
          sim.vel.z *= 0.5;
          sim.angVel.x *= 0.4;
          sim.angVel.y *= 0.4;
          sim.angVel.z *= 0.4;
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
      const onTable =
        sim.pos.y <= REST_Y + 0.02 &&
        sim.bounceCount >= MIN_BOUNCES_BEFORE_SETTLE;

      if (
        onTable &&
        airTime >= MIN_AIR_TIME &&
        ((speed < 0.7 && angSpeed < 1.5) || airTime > MAX_AIR_TIME)
      ) {
        sim.phase = "settle";
        sim.settleStart = now;
        sim.vel = { x: 0, y: 0, z: 0 };
        sim.angVel = { x: 0, y: 0, z: 0 };
      }

      group.position.set(sim.pos.x, sim.pos.y, sim.pos.z);
      group.rotation.set(sim.rot.x, sim.rot.y, sim.rot.z);

      if (isBrokenDie) {
        const pulse = 0.5 + 0.5 * Math.sin(now * 12);
        const bounceGlow = Math.min(sim.bounceCount / 5, 1);
        const intensity = 0.2 + bounceGlow * 0.6 + pulse * 0.4;
        for (const mat of materials) {
          mat.emissive = { r: 1, g: 0.15, b: 0 } as any;
          mat.emissiveIntensity = intensity;
        }
      }
      return;
    }

    if (sim.phase === "settle") {
      const [tx, ty, tz] = TARGET_ROTATION[targetValue];
      const t = Math.min((now - sim.settleStart) * 2.0, 1);
      const ease = 1 - Math.pow(1 - t, 3);

      sim.pos.x += (sim.homeX - sim.pos.x) * ease * 0.15;
      sim.pos.y += (REST_Y - sim.pos.y) * ease * 0.15;
      sim.pos.z += (sim.homeZ - sim.pos.z) * ease * 0.15;

      sim.rot.x = lerpAngle(sim.rot.x, tx, ease * 0.2);
      sim.rot.y = lerpAngle(sim.rot.y, ty, ease * 0.2);
      sim.rot.z = lerpAngle(sim.rot.z, tz, ease * 0.2);

      group.position.set(sim.pos.x, sim.pos.y, sim.pos.z);
      group.rotation.set(sim.rot.x, sim.rot.y, sim.rot.z);

      if (isBrokenDie) {
        const pulse = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 14);
        const fadeOut = 1 - t;
        for (const mat of materials) {
          mat.emissiveIntensity = fadeOut * (0.3 + pulse * 0.5);
        }
      }

      if (t >= 1 && !settledRef.current) {
        settledRef.current = true;
        sim.phase = "done";
        onSettled(index, lastThrowKey.current);
      }
      return;
    }

    if (sim.phase === "done") {
      if (isBrokenDie) {
        for (const mat of materials) {
          mat.emissive = { r: 1, g: 0.15, b: 0 } as any;
          mat.emissiveIntensity = 0.15;
        }

        if (!splitStartedRef.current) {
          splitStartedRef.current = true;
          splitTimeRef.current = now;
        }

        const elapsed = now - splitTimeRef.current;

        if (elapsed < BROKEN_SPLIT_DELAY) {
          if (fullCubeRef.current) fullCubeRef.current.visible = true;
          if (topHalfRef.current) topHalfRef.current.visible = false;
          if (bottomHalfRef.current) bottomHalfRef.current.visible = false;
          const [ftx, fty, ftz] = TARGET_ROTATION[targetValue];
          group.position.set(sim.homeX, REST_Y, sim.homeZ);
          group.rotation.set(ftx, fty, ftz);
          return;
        }

        if (!freezeDoneRef.current) {
          freezeDoneRef.current = true;
          if (fullCubeRef.current) fullCubeRef.current.visible = false;
          if (topHalfRef.current) topHalfRef.current.visible = true;
          if (bottomHalfRef.current) bottomHalfRef.current.visible = true;
        }

        const splitElapsed = elapsed - BROKEN_SPLIT_DELAY;
        const s = Math.min(splitElapsed / BROKEN_SPLIT_DURATION, 1);
        const ease = 1 - Math.pow(1 - s, 3);
        const MIN_SPREAD = 0.8;
        halfOffset.current = MIN_SPREAD + (BROKEN_HALF_OFFSET - MIN_SPREAD) * ease;

        const [ttx, tty, ttz] = TARGET_ROTATION[targetValue];
        const [btx, bty, btz] = TARGET_ROTATION[7 - targetValue];

        if (topHalfRef.current) {
          topHalfRef.current.position.set(0, 0, halfOffset.current);
          topHalfRef.current.rotation.set(ttx, tty, ttz);
        }
        if (bottomHalfRef.current) {
          bottomHalfRef.current.position.set(0, 0, -halfOffset.current);
          bottomHalfRef.current.rotation.set(btx, bty, btz);
        }

        group.position.set(sim.homeX, REST_Y, sim.homeZ);
        group.rotation.set(0, 0, 0);
      } else {
        const [tx, ty, tz] = TARGET_ROTATION[targetValue];
        group.position.set(sim.homeX, REST_Y, sim.homeZ);
        group.rotation.set(tx, ty, tz);
      }
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={fullCubeRef} castShadow receiveShadow>
        <boxGeometry args={[1.6, 1.6, 1.6]} />
        {materials.map((material, i) => (
          <primitive key={i} object={material} attach={`material-${i}`} />
        ))}
      </mesh>

      <group ref={topHalfRef} visible={false}>
        <DiceHalf isTop={true} innerTexture={innerTexture} />
      </group>

      <group ref={bottomHalfRef} visible={false}>
        <DiceHalf isTop={false} innerTexture={innerTexture} />
      </group>
    </group>
  );
}

export default DiceMesh;
