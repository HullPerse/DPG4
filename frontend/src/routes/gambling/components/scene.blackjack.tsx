import { PCFShadowMap } from "three";
import { Canvas } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import type { PlayingCard } from "@/types/gamble";
import { getCardSlot } from "@/lib/gambling/blackjack.utils";
import CardMesh from "./mesh.card";

function DeckStack() {
  return (
    <group position={[3.2, 0.88, -2.2]}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, i * 0.04, 0]} castShadow>
          <boxGeometry args={[1.05, 0.06, 1.45]} />
          <meshStandardMaterial color="#232136" roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function BlackjackScene({
  playerHand,
  dealerHand,
  dealerHoleHidden,
  holeCard,
  flyingCards,
  revealHole,
}: {
  playerHand: PlayingCard[];
  dealerHand: PlayingCard[];
  dealerHoleHidden: boolean;
  holeCard: PlayingCard | null;
  flyingCards: Set<string>;
  revealHole: boolean;
}) {
  const dealerCount = dealerHoleHidden
    ? dealerHand.length + 1
    : dealerHand.length;

  return (
    <Canvas
      shadows={{ type: PCFShadowMap }}
      camera={{ position: [0, 12, 5.6], fov: 28 }}
      className="h-full w-full"
      gl={{ antialias: true, alpha: true }}
    >
      <color attach="background" args={["#191724"]} />
      <ambientLight intensity={0.45} />
      <directionalLight
        castShadow
        position={[6, 10, 4]}
        intensity={1.1}
        shadow-mapSize={[512, 512]}
      />
      <directionalLight
        position={[-4, 3, -2]}
        intensity={0.35}
        color="#c4a7e7"
      />
      <pointLight position={[0, 2, 4]} intensity={0.4} color="#f6c177" />

      <group position={[0, -0.15, 0]}>
        <DeckStack />

        {dealerHand.map((card, i) => (
          <CardMesh
            key={`d-${i}`}
            card={card}
            faceDown={false}
            target={getCardSlot("dealer", i, dealerCount)}
            flyIn={flyingCards.has(`d-${i}`)}
            stagger={i}
            flipReveal={false}
          />
        ))}

        {dealerHoleHidden && (
          <CardMesh
            key="d-hole"
            card={revealHole ? holeCard : null}
            faceDown={!revealHole}
            target={getCardSlot("dealer", 1, dealerCount)}
            flyIn={flyingCards.has("d-hole")}
            stagger={1}
            flipReveal={revealHole}
          />
        )}

        {playerHand.map((card, i) => (
          <CardMesh
            key={`p-${i}`}
            card={card}
            faceDown={false}
            target={getCardSlot("player", i, playerHand.length)}
            flyIn={flyingCards.has(`p-${i}`)}
            stagger={i + 2}
            flipReveal={false}
          />
        ))}
      </group>

      <ContactShadows
        position={[0, -0.05, 0]}
        opacity={0.45}
        scale={14}
        blur={2.5}
        far={4}
      />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.05, 0]}
        receiveShadow
      >
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="fff" roughness={0.9} />
      </mesh>
    </Canvas>
  );
}

export default BlackjackScene;
