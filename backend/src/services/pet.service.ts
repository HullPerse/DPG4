import { eq } from "drizzle-orm";
import * as schema from "@/db/schema.db";
import { nowIso } from "@/lib/index.utils";
import Logger from "@/lib/logger.utils";

const MIN_STAT = 0;
export const DECAY_PER_HOUR = { hunger: 5, happiness: 3, energy: 4 };

export function calcDecayed(stat: number, elapsedHours: number, decay: number): number {
  return Math.max(MIN_STAT, Math.round(stat - elapsedHours * decay));
}

class PetService {
  private logger = new Logger("PETS");
}

export default PetService;
