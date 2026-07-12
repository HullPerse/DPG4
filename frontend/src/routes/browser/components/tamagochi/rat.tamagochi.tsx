import { ModelConfigEntry } from "@/types/config";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

function RatModel({
  reaction,
  spinning,
  isAlive,
  color,
  modelCfg,
}: {
  reaction: string | null;
  spinning: boolean;
  isAlive: boolean;
  color: string;
  modelCfg: ModelConfigEntry;
}) {
  const { scene } = useGLTF(modelCfg.file);
  const groupRef = useRef<THREE.Group>(null);
  const cloned = useMemo(() => {
    const c = scene.clone();
    c.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = child.material.clone();
      }
    });
    return c;
  }, [scene]);
  const animRef = useRef<{ type: string; elapsed: number } | null>(null);
  const prevReaction = useRef<string | null>(null);
  const deadColor = useRef(new THREE.Color(0x666666));
  const targetColor = useRef(new THREE.Color(color));

  useEffect(() => {
    targetColor.current.set(color);
  }, [color]);

  if (reaction && reaction !== prevReaction.current) {
    animRef.current = { type: reaction, elapsed: 0 };
    prevReaction.current = reaction;
  }

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    if (!isAlive) {
      groupRef.current.rotation.x = modelCfg.dead.rotation[0];
      groupRef.current.rotation.z = modelCfg.dead.rotation[2];
      groupRef.current.rotation.y = modelCfg.dead.rotation[1];
      groupRef.current.scale.setScalar(modelCfg.dead.scale);
      groupRef.current.position.set(
        modelCfg.dead.position[0],
        modelCfg.dead.position[1],
        modelCfg.dead.position[2],
      );
      cloned.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          (child.material as THREE.MeshStandardMaterial).color.lerp(deadColor.current, 0.05);
        }
      });
      return;
    }

    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        (child.material as THREE.MeshStandardMaterial).color.lerp(targetColor.current, 0.08);
      }
    });

    const cfgScale = modelCfg.model.scale;
    const cfgPosY = modelCfg.model.position[1];

    const anim = animRef.current;
    if (!anim) {
      if (spinning) {
        groupRef.current.rotation.y += delta * 1.5;
      } else {
        groupRef.current.rotation.y = modelCfg.model.rotation[1];
      }
      groupRef.current.rotation.x = modelCfg.model.rotation[0];
      groupRef.current.rotation.z = modelCfg.model.rotation[2];
      groupRef.current.scale.setScalar(cfgScale);
      groupRef.current.position.set(
        modelCfg.model.position[0],
        cfgPosY,
        modelCfg.model.position[2],
      );
      return;
    }

    anim.elapsed += delta;
    const progress = Math.min(anim.elapsed / 0.8, 1);

    if (anim.type === "feed") {
      const bounce = 1 + Math.sin(progress * Math.PI * 3) * 0.12 * (1 - progress);
      groupRef.current.scale.setScalar(cfgScale * bounce);
    } else if (anim.type === "pet") {
      groupRef.current.rotation.z = Math.sin(progress * Math.PI * 4) * 0.1 * (1 - progress);
    } else if (anim.type === "sleep") {
      groupRef.current.position.y = cfgPosY - Math.sin(progress * Math.PI) * 0.3;
    }

    if (progress >= 1) {
      animRef.current = null;
    }
  });

  return (
    <group
      ref={groupRef}
      scale={modelCfg.model.scale}
      position={[
        modelCfg.model.position[0],
        modelCfg.model.position[1],
        modelCfg.model.position[2],
      ]}
      rotation={[
        modelCfg.model.rotation[0],
        modelCfg.model.rotation[1],
        modelCfg.model.rotation[2],
      ]}
    >
      <primitive object={cloned} />
    </group>
  );
}

export default RatModel;
