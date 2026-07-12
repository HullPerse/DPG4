import { ModelConfigEntry } from "@/types/config";
import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";

function CameraController({ modelCfg }: { modelCfg: ModelConfigEntry }) {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(
      modelCfg.camera.position[0],
      modelCfg.camera.position[1],
      modelCfg.camera.position[2],
    );
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = modelCfg.camera.fov;
      camera.updateProjectionMatrix();
    }
  }, [modelCfg, camera]);

  return null;
}

export default CameraController;
