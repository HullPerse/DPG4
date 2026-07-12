import { ModelConfigEntry } from "@/types/config";
import { Environment, OrbitControls } from "@react-three/drei";
import { Suspense } from "react";
import RatModel from "./rat.tamagochi";
import CameraController from "./camera.tamagochi";

function SceneContent({
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
  return (
    <>
      <CameraController modelCfg={modelCfg} />
      <OrbitControls enablePan={true} />
      <Environment preset="city" />
      <color attach="background" args={["#232136"]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 6, 4]} intensity={1.6} color="#f6c177" />
      <directionalLight position={[-4, 3, -3]} intensity={0.6} color="#c4a7e7" />
      <directionalLight position={[-2, -1, 6]} intensity={0.4} color="#eb6f92" />
      <directionalLight position={[0, -4, -4]} intensity={0.25} color="#31748f" />
      <Suspense fallback={null}>
        <RatModel
          reaction={reaction}
          spinning={spinning}
          isAlive={isAlive}
          color={color}
          modelCfg={modelCfg}
        />
      </Suspense>
    </>
  );
}

export default SceneContent;
