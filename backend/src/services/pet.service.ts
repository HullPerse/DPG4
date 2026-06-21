import { eq } from "drizzle-orm";
import * as schema from "@/db/schema.db";
import { db } from "@/db/index.db";
import { nowIso } from "@/lib/index.utils";
import { broadcast } from "@/lib/websocket.utils";
import Logger from "@/lib/logger.utils";

const MIN_STAT = 0;
export const DECAY_PER_HOUR = { hunger: 5, happiness: 3, energy: 4 };
const DECAY_INTERVAL_MS = 30_000;

export function calcDecayed(stat: number, elapsedHours: number, decay: number): number {
  return Math.max(MIN_STAT, Math.round(stat - elapsedHours * decay));
}

class PetService {
  private logger = new Logger("PETS");

  startDecayLoop() {
    setInterval(async () => {
      try {
        const now = nowIso();
        const pets = await db
          .select()
          .from(schema.pets)
          .where(eq(schema.pets.isAlive, true));

        for (const pet of pets) {
          const elapsedMs = new Date(now).getTime() - new Date(pet.lastUpdated).getTime();
          if (elapsedMs < DECAY_INTERVAL_MS) continue;

          const elapsedHours = elapsedMs / (1000 * 60 * 60);
          const hunger = calcDecayed(pet.hunger, elapsedHours, DECAY_PER_HOUR.hunger);
          const happiness = calcDecayed(pet.happiness, elapsedHours, DECAY_PER_HOUR.happiness);
          const energy = calcDecayed(pet.energy, elapsedHours, DECAY_PER_HOUR.energy);

          if (hunger === pet.hunger && happiness === pet.happiness && energy === pet.energy) continue;

          await db
            .update(schema.pets)
            .set({ hunger, happiness, energy, lastUpdated: now, updated: now })
            .where(eq(schema.pets.id, pet.id));

          broadcast("pets", "update", pet.userId);
        }
      } catch (err) {
        this.logger.error(`decay loop error ${err}`);
      }
    }, DECAY_INTERVAL_MS);

    this.logger.info("Pet decay loop started (interval 30s)");
  }
}

export default PetService;
