import { Elysia } from "elysia";
import Logger from "@/lib/logger.utils";

const logger = new Logger("HTTP");

const loggedMethods = new Set(["GET", "POST", "PATCH", "PUT", "DELETE"]);
const skipPaths = ["/files/", "/ws"];

export default new Elysia({ name: "request-logger" })
  .onRequest(({ request, path }) => {
    if (!loggedMethods.has(request.method)) return;
    if (skipPaths.some((p) => path.startsWith(p))) return;
    logger.info(`${request.method} ${path}`);
  });

