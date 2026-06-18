import { Elysia } from "elysia";
import { logger } from "../lib/logger";
import { LOG_SYSTEM } from "../lib/constants";

export const errorPlugin = new Elysia({ name: "error-handler" })
  .onError({ as: "global" }, ({ error, set }) => {
    if (set.status && set.status < 500) {
      return;
    }

    const msg = error instanceof Error ? error.message : String(error);
    logger.error(LOG_SYSTEM, "Unhandled error", msg);

    set.status = 500;
    return { error: "Internal server error" };
  });
