import type { effectInterface } from "@/types/items";
import { userSelectEffects } from "./effects/user-select.effect";
import { itemSelectEffects } from "./effects/item-select.effect";
import { inventoryEffects } from "./effects/inventory.effect";
import { gameSelectEffects } from "./effects/game-select.effect";
import { wheelEffects } from "./effects/wheel.effect";
import { quizEffects } from "./effects/quiz.effect";
import { randomEffects } from "./effects/random.effect";
import { switchEffects } from "./effects/switch.effect";
import { specialEffects } from "./effects/special.effect";
import { ratIds, pigIds, gremlinIds } from "./item.categories";

export { ratIds, pigIds, gremlinIds };

export const itemEffect: effectInterface[] = [
  ...userSelectEffects,
  ...itemSelectEffects,
  ...inventoryEffects,
  ...gameSelectEffects,
  ...wheelEffects,
  ...quizEffects,
  ...randomEffects,
  ...switchEffects,
  ...specialEffects,
];
