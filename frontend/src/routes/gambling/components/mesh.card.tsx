import { useRef, useMemo, useEffect, memo, type ComponentProps } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, MeshStandardMaterial, BoxGeometry } from "three";
import type { PlayingCard } from "@/types/gamble";
import {
  createCardTexture,
  DECK_POSITION,
} from "@/lib/gambling/blackjack.utils";

const CARD_W = 1.05;
const CARD_H = 0.08;
const CARD_D = 1.45;

const cardGeometry = new BoxGeometry(CARD_W, CARD_H, CARD_D);

function CardMesh({
  card,
  faceDown,
  target,
  flyIn,
  stagger,
  flipReveal,
}: {
  card: PlayingCard | null;
  faceDown: boolean;
  target: [number, number, number];
  flyIn: boolean;
  stagger: number;
  flipReveal: boolean;
}) {
  const groupRef = useRef<Group>(null);
  const startTime = useRef(-1);
  const done = useRef(!flyIn);
  const targetRef = useRef(target);
  targetRef.current = target;

  const material = useMemo(() => {
    const showBack = faceDown && !flipReveal;
    const tex = createCardTexture(showBack ? "back" : card ?? "back");
    return new MeshStandardMaterial({
      map: tex,
      roughness: 0.4,
      metalness: 0.05,
    });
  }, [card, faceDown, flipReveal]);

  useEffect(() => {
    if (flyIn) {
      done.current = false;
      startTime.current = -1;
      const group = groupRef.current;
      if (group) {
        group.position.set(...DECK_POSITION);
        group.rotation.set(-0.35, 0.15, 0);
      }
      return;
    }

    done.current = true;
    startTime.current = -1;
    const group = groupRef.current;
    if (group) {
      group.position.set(...targetRef.current);
    }
  }, [flyIn]);

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;

    const now = state.clock.elapsedTime;
    const [tx, ty, tz] = targetRef.current;

    if (flyIn && !done.current) {
      if (startTime.current < 0) {
        startTime.current = now;
        group.position.set(...DECK_POSITION);
        group.rotation.set(-0.35, 0.15, 0);
      }

      const delay = stagger * 0.14;
      const t = Math.min(Math.max((now - startTime.current - delay) * 2.2, 0), 1);
      const ease = 1 - Math.pow(1 - t, 3);

      group.position.x = DECK_POSITION[0] + (tx - DECK_POSITION[0]) * ease;
      group.position.y = DECK_POSITION[1] + (ty - DECK_POSITION[1]) * ease;
      group.position.z = DECK_POSITION[2] + (tz - DECK_POSITION[2]) * ease;
      group.rotation.x = -0.35 * (1 - ease);

      if (t >= 1) {
        done.current = true;
        group.position.set(tx, ty, tz);
        group.rotation.x = 0;
      }
      return;
    }

    group.position.x += (tx - group.position.x) * 0.14;
    group.position.y += (ty - group.position.y) * 0.14;
    group.position.z += (tz - group.position.z) * 0.14;
    group.rotation.x *= 0.88;

    const faceUp = !faceDown || flipReveal;
    const flipStart = startTime.current >= 0 ? startTime.current : now;
    const flipT = flipReveal
      ? Math.min(Math.max((now - flipStart) * 2.8, 0), 1)
      : faceUp
        ? 1
        : 0;
    const flipEase = 1 - Math.pow(1 - flipT, 2);
    group.rotation.y = faceUp ? -Math.PI * (1 - flipEase) : Math.PI * flipEase;
  });

  return (
    <group ref={groupRef}>
      <mesh castShadow receiveShadow geometry={cardGeometry} material={material} />
    </group>
  );
}

function cardMeshPropsEqual(
  prev: Readonly<ComponentProps<typeof CardMesh>>,
  next: Readonly<ComponentProps<typeof CardMesh>>,
) {
  return (
    prev.flyIn === next.flyIn &&
    prev.faceDown === next.faceDown &&
    prev.flipReveal === next.flipReveal &&
    prev.stagger === next.stagger &&
    prev.card?.rank === next.card?.rank &&
    prev.card?.suit === next.card?.suit &&
    prev.target[0] === next.target[0] &&
    prev.target[1] === next.target[1] &&
    prev.target[2] === next.target[2]
  );
}

export default memo(CardMesh, cardMeshPropsEqual);
