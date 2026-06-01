import { Group, MeshStandardMaterial } from "three";
import {
  REST_Y,
  GRAVITY,
  STAGGER_S,
  MIN_AIR_TIME,
  FACE_VALUES,
  TARGET_ROTATION,
  createDiceFaceTexture,
  lerpAngle,
  createThrowSim,
  createIdleSim,
} from "@/lib/gambling/dice.utils";
import { DiceSim } from "@/types/gamble";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";

function DiceMesh({
  index,
  targetValue,
  throwKey,
  onSettled,
}: {
  index: number;
  targetValue: number;
  throwKey: number;
  onSettled: () => void;
}) {
  const groupRef = useRef<Group>(null);
  const simRef = useRef<DiceSim>(createIdleSim(index));
  const settledRef = useRef(false);
  const lastThrowKey = useRef(0);

  const materials = useMemo(() => {
    return FACE_VALUES.map((faceValue) => {
      const tex = createDiceFaceTexture(faceValue);
      return new MeshStandardMaterial({
        map: tex,
        roughness: 0.35,
        metalness: 0.08,
      });
    });
  }, []);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const dt = Math.min(delta, 0.033);
    const now = state.clock.elapsedTime;

    if (throwKey !== lastThrowKey.current) {
      lastThrowKey.current = throwKey;
      settledRef.current = false;
      simRef.current = createThrowSim(index, now);
    }

    const sim = simRef.current;

    if (sim.phase === "idle") {
      group.position.set(sim.pos.x, sim.pos.y, sim.pos.z);
      group.rotation.set(sim.rot.x, sim.rot.y, sim.rot.z);
      return;
    }

    if (sim.phase === "flying") {
      sim.vel.y -= GRAVITY * dt;
      sim.pos.x += sim.vel.x * dt;
      sim.pos.y += sim.vel.y * dt;
      sim.pos.z += sim.vel.z * dt;

      sim.rot.x += sim.angVel.x * dt;
      sim.rot.y += sim.angVel.y * dt;
      sim.rot.z += sim.angVel.z * dt;

      sim.vel.x *= 1 - 0.4 * dt;
      sim.vel.z *= 1 - 0.35 * dt;
      sim.angVel.x *= 1 - 0.8 * dt;
      sim.angVel.y *= 1 - 0.8 * dt;
      sim.angVel.z *= 1 - 0.8 * dt;

      if (sim.pos.y <= REST_Y) {
        sim.pos.y = REST_Y;
        sim.bounceCount += 1;

        const restitution = sim.bounceCount > 2 ? 0.18 : 0.42;
        sim.vel.y = Math.abs(sim.vel.y) * restitution;
        sim.vel.x += (Math.random() - 0.5) * 1.4;
        sim.vel.z += (Math.random() - 0.5) * 1.2;

        sim.angVel.x += (Math.random() - 0.5) * 2;
        sim.angVel.y += (Math.random() - 0.5) * 2;
        sim.angVel.z += (Math.random() - 0.5) * 2;

        if (sim.bounceCount > 1) {
          sim.vel.x *= 0.55;
          sim.vel.z *= 0.55;
          sim.angVel.x *= 0.45;
          sim.angVel.y *= 0.45;
          sim.angVel.z *= 0.45;
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
      const settleGate = MIN_AIR_TIME + index * STAGGER_S;
      const onTable = sim.pos.y <= REST_Y + 0.02 && sim.bounceCount >= 1;

      if (onTable && airTime >= settleGate && speed < 1.35 && angSpeed < 2.5) {
        sim.phase = "settle";
        sim.settleStart = now;
        sim.vel = { x: 0, y: 0, z: 0 };
        sim.angVel = { x: 0, y: 0, z: 0 };
      }

      group.position.set(sim.pos.x, sim.pos.y, sim.pos.z);
      group.rotation.set(sim.rot.x, sim.rot.y, sim.rot.z);
      return;
    }

    if (sim.phase === "settle") {
      const [tx, ty, tz] = TARGET_ROTATION[targetValue];
      const t = Math.min((now - sim.settleStart) * 2.8, 1);
      const ease = 1 - Math.pow(1 - t, 3);

      sim.pos.x += (sim.homeX - sim.pos.x) * ease * 0.18;
      sim.pos.y += (REST_Y - sim.pos.y) * ease * 0.18;
      sim.pos.z += (0 - sim.pos.z) * ease * 0.18;

      sim.rot.x = lerpAngle(sim.rot.x, tx, ease * 0.22);
      sim.rot.y = lerpAngle(sim.rot.y, ty, ease * 0.22);
      sim.rot.z = lerpAngle(sim.rot.z, tz, ease * 0.22);

      group.position.set(sim.pos.x, sim.pos.y, sim.pos.z);
      group.rotation.set(sim.rot.x, sim.rot.y, sim.rot.z);

      if (t >= 1 && !settledRef.current) {
        settledRef.current = true;
        sim.phase = "done";
        onSettled();
      }
      return;
    }

    if (sim.phase === "done") {
      const [tx, ty, tz] = TARGET_ROTATION[targetValue];
      group.position.set(sim.homeX, REST_Y, 0);
      group.rotation.set(tx, ty, tz);
    }
  });

  return (
    <group ref={groupRef}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.6, 1.6, 1.6]} />
        {materials.map((material, i) => (
          <primitive key={i} object={material} attach={`material-${i}`} />
        ))}
      </mesh>
    </group>
  );
}

export default DiceMesh;
