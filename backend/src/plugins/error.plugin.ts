import { Elysia } from "elysia";
import Logger from "@/lib/logger.utils";

const logger = new Logger("SYSTEM");

const errorPlugin = new Elysia({ name: "error-handler" }).onError(
  { as: "global" },
  ({ error, set }) => {
    if (set.status && Number(set.status) < 500) {
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Unhandled error: ${message}`);

    set.status = 500;
    return { error: "Internal server error" };
  },
);

export default errorPlugin;
