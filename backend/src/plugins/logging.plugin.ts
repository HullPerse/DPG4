import { Elysia } from "elysia";
import Logger from "@/lib/logger.utils";

const logger = new Logger("HTTP");

const loggedMethods = new Set(["GET", "POST", "PATCH", "PUT", "DELETE"]);
const skipPaths = ["/files/", "/ws"];

function formatExtra(responseValue: unknown): string {
  if (!responseValue || typeof responseValue !== "object") return "";
  if (responseValue instanceof Response) return "";
  const obj = responseValue as Record<string, unknown>;
  if (Array.isArray(obj)) return ` [${obj.length} results]`;
  if ("error" in obj) return ` error=${obj.error}`;
  if (typeof obj.label === "string") return ` label=${obj.label}`;
  if (typeof obj.username === "string") return ` user=${obj.username}`;
  return "";
}

export default new Elysia({ name: "request-logger" })
  .onAfterResponse((ctx) => {
    const { request, path, responseValue } = ctx;
    if (!loggedMethods.has(request.method)) return;
    if (skipPaths.some((p) => path.startsWith(p))) return;
    const user = (ctx as Record<string, unknown>).user as
      | { username?: string }
      | undefined;
    const actor = user?.username ?? "guest";
    logger.info(`${request.method} ${path} | ${actor}${formatExtra(responseValue)}`);
  });
