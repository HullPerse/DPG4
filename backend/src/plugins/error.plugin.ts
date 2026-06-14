import { Elysia } from "elysia";
import { logger } from "../lib/logger";

export const errorPlugin = new Elysia({ name: "error-handler" })
  .onError({ as: "global" }, ({ error, set }) => {
    const msg = error instanceof Error ? error.message : String(error);

    if (msg === "Unauthorized" || msg === "Not found") {
      return;
    }

    logger.error("SYSTEM", "Unhandled error", msg);

    set.status = 500;
    return { error: "Internal server error" };
  });
