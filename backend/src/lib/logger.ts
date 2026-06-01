import { mkdir } from "node:fs/promises";
import { join } from "node:path";

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_NUM: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LEVEL_COLOR: Record<LogLevel, string> = {
  debug: "\x1b[90m",
  info: "\x1b[36m",
  warn: "\x1b[33m",
  error: "\x1b[31m",
};

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const GRAY = "\x1b[90m";

const config = {
  minLevel: (Bun.env.LOG_LEVEL as LogLevel) || "info",
};

const LOG_FILE = join(import.meta.dir, "..", "..", "logs", "server.log");

let fileWriter: ReturnType<Bun.FileWriter> | null = null;

async function ensureLogFile() {
  if (fileWriter) return;
  await mkdir(join(import.meta.dir, "..", "..", "logs"), { recursive: true });
  fileWriter = Bun.file(LOG_FILE).writer();
}

function time() {
  const d = new Date();
  return d.toLocaleTimeString("en-GB", { hour12: false });
}

function isoTime() {
  return new Date().toISOString();
}

function fmtArg(a: unknown): string {
  if (typeof a === "string") return a;
  if (a instanceof Error) return a.stack ?? a.message;
  if (typeof a === "object" && a !== null) return Bun.inspect(a);
  return String(a);
}

async function log(
  level: LogLevel,
  username: string | null | undefined,
  message: string,
  ...args: unknown[]
) {
  if (LEVEL_NUM[level] < LEVEL_NUM[config.minLevel]) return;

  const prefix = username ? `${BOLD}${username}${RESET}: ` : "";
  const detail = args.length ? ` ${args.map(fmtArg).join(" ")}` : "";

  console.log(
    `${GRAY}${time()}${RESET} ${LEVEL_COLOR[level]}${level.toUpperCase()}${RESET} ${prefix}${message}${detail}`,
  );

  try {
    await ensureLogFile();
    const entry = {
      t: isoTime(),
      l: level.toUpperCase(),
      u: username ?? null,
      m: message,
      d: args.length ? args.map(fmtArg) : [],
    };
    fileWriter!.write(JSON.stringify(entry) + "\n");
  } catch {}
}

export const logger = {
  debug: (
    username: string | null | undefined,
    message: string,
    ...args: unknown[]
  ) => log("debug", username, message, ...args),
  info: (
    username: string | null | undefined,
    message: string,
    ...args: unknown[]
  ) => log("info", username, message, ...args),
  warn: (
    username: string | null | undefined,
    message: string,
    ...args: unknown[]
  ) => log("warn", username, message, ...args),
  error: (
    username: string | null | undefined,
    message: string,
    ...args: unknown[]
  ) => log("error", username, message, ...args),
};

export { LOG_FILE };
