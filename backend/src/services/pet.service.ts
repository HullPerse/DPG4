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

        const nowMs = new Date(now).getTime();
        const updates: { id: string; userId: string; hunger: number; happiness: number; energy: number }[] = [];

        for (const pet of pets) {
          const elapsedMs = nowMs - new Date(pet.lastUpdated).getTime();
          if (elapsedMs < DECAY_INTERVAL_MS) continue;

          const elapsedHours = elapsedMs / (1000 * 60 * 60);
          const hunger = calcDecayed(pet.hunger, elapsedHours, DECAY_PER_HOUR.hunger);
          const happiness = calcDecayed(pet.happiness, elapsedHours, DECAY_PER_HOUR.happiness);
          const energy = calcDecayed(pet.energy, elapsedHours, DECAY_PER_HOUR.energy);

          if (hunger === pet.hunger && happiness === pet.happiness && energy === pet.energy) continue;

          updates.push({ id: pet.id, userId: pet.userId, hunger, happiness, energy });
        }

        if (updates.length === 0) return;

        for (const u of updates) {
          await db
            .update(schema.pets)
            .set({ hunger: u.hunger, happiness: u.happiness, energy: u.energy, lastUpdated: now, updated: now })
            .where(eq(schema.pets.id, u.id));

          broadcast("pets", "update", u.userId);
        }
      } catch (err: unknown) {
        this.logger.error(`decay loop error ${err}`);
      }
    }, DECAY_INTERVAL_MS);

    this.logger.info("Pet decay loop started (interval 30s)");
  }
}

export default PetService;
