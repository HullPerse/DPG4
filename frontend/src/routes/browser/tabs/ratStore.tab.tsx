import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, OrbitControls, useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { itemsApi } from "@/api/items.api";
import { getFileUrl } from "@/api/client.api";
import ImageComponent from "@/components/shared/image.component";
import { Button } from "@/components/ui/button.component";
import { useUserStore } from "@/store/user.store";
import type { Inventory, Item } from "@/types/items";
import { useMutation } from "@tanstack/react-query";



useGLTF.preload("/models/rat.glb");

function RatModel({ spinning }: { spinning: boolean }) {
  const { scene } = useGLTF("/models/rat.glb");
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
      <color attach="background" args={["#232136"]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 6, 4]} intensity={1.6} color="#f6c177" />
      <directionalLight
        position={[-4, 3, -3]}
        intensity={0.6}
        color="#c4a7e7"
      />
      <directionalLight
        position={[-2, -1, 6]}
        intensity={0.4}
        color="#eb6f92"
      />
      <directionalLight
        position={[0, -4, -4]}
        intensity={0.25}
        color="#31748f"
      />
      <group position={[0, -0.8, 0]}>
        <Suspense fallback={null}>
          <RatModel spinning={!isOrbiting} />
        </Suspense>
      </group>
    </>
  );
}

function RatStoreTab() {
  const user = useUserStore((state) => state.user);
  const [ratItems, setRatItems] = useState<Inventory[]>([]);
  const [receivedItem, setReceivedItem] = useState<Item | null>(null);
  const [ratLabels, setRatLabels] = useState<string[]>([]);

  useEffect(() => {
    itemsApi.getRatLabels().then(setRatLabels);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    itemsApi.getInventory(user.id).then((inv) => {
      setRatItems(
        inv.filter(
          (i: Inventory) => i.type === "rat" || ratLabels.includes(i.label),
        ),
      );
    });
  }, [user?.id, ratLabels]);

  const exchangeMutation = useMutation({
    mutationFn: (inventoryId: string) =>
      itemsApi.ratExchange(user!.id, inventoryId),
    onSuccess: (item, inventoryId) => {
      setReceivedItem(item);
      setRatItems((prev) => prev.filter((i) => i.id !== inventoryId));
    },
  });

  return (
    <div className="flex h-full w-full">
      <div className="flex flex-col w-1/2 h-full gap-3 p-4 overflow-y-auto">
        <h1 className="text-2xl font-bold text-center">КРЫСИНАЯ ЛАВКА</h1>

        {receivedItem && (
          <div className="flex flex-col items-center gap-2 p-3 border-2 border-highlight-high shadow-sharp-sm bg-background">
            <span className="text-lg font-bold text-primary">ВЫ ПОЛУЧИЛИ:</span>
            <ImageComponent
              src={`${getFileUrl(receivedItem)}`}
              alt={receivedItem.label}
              className="min-w-24 w-24 min-h-24 h-24 border border-highlight-high"
              type="cover"
            />
            <span className="font-bold text-md">{receivedItem.label}</span>
            <span className="text-xs text-text/70 leading-tight text-center">
              {receivedItem.description}
            </span>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {ratItems.length === 0 && (
            <div className="flex w-full h-32 items-center justify-center text-text/40 text-lg font-bold">
              Нет крысиных предметов
            </div>
          )}

          {ratItems.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center gap-2 p-2 border border-highlight-high shadow-sharp-sm bg-background"
            >
              <ImageComponent
                src={`${getFileUrl(inv)}`}
                alt={inv.label}
                className="min-w-12 w-12 min-h-12 h-12 border border-highlight-high"
                type="cover"
              />
              <div className="flex flex-col flex-1 min-w-0">
                <span className="font-bold text-sm truncate">{inv.label}</span>
                <span className="text-xs text-text/50">x{inv.charge}</span>
              </div>
              <Button
                variant="success"
                className="h-8 shrink-0"
                onClick={() => exchangeMutation.mutate(inv.id)}
                loading={exchangeMutation.isPending}
                disabled={exchangeMutation.isPending}
              >
                ОТДАТЬ
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="w-1/2 h-full">
        <Canvas
          camera={{ position: [3.5, 2, 5], fov: 42 }}
          className="h-full w-full"
          gl={{ antialias: true, alpha: true }}
        >
          <Suspense fallback={null}>
            <SceneContent />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}

export default RatStoreTab;
