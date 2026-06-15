import pino from "pino";
import { resolveBackendPath } from "./paths";

const LOG_LEVEL = Bun.env.LOG_LEVEL || "info";
const LOG_FILE = resolveBackendPath("logs", "server.log");

const fileTransport = pino.transport({
  target: "pino/file",
  options: { destination: LOG_FILE, mkdir: true },
});

const consoleTransport = pino.transport({
  target: "pino-pretty",
  options: {
    colorize: true,
    translateTime: "HH:MM:ss",
    ignore: "pid,hostname",
  },
});

const baseLogger = pino(
  { level: LOG_LEVEL },
  pino.multistream([{ stream: consoleTransport }, { stream: fileTransport }]),
);

function fmtArg(a: unknown): string {
  if (a instanceof Error) return a.stack ?? a.message;
  if (typeof a === "object" && a !== null) return JSON.stringify(a);
  return String(a);
}

function buildMsg(message: string, args: unknown[]): string {
  if (!args.length) return message;
  return `${message} ${args.map(fmtArg).join(" ")}`;
}

export const logger = {
  debug: (
    username: string | null | undefined,
    message: string,
    ...args: unknown[]
  ) => baseLogger.debug({ user: username }, buildMsg(message, args)),
  info: (
    username: string | null | undefined,
    message: string,
    ...args: unknown[]
  ) => baseLogger.info({ user: username }, buildMsg(message, args)),
  warn: (
    username: string | null | undefined,
    message: string,
    ...args: unknown[]
  ) => baseLogger.warn({ user: username }, buildMsg(message, args)),
  error: (
    username: string | null | undefined,
    message: string,
    ...args: unknown[]
  ) => baseLogger.error({ user: username }, buildMsg(message, args)),
};

export { LOG_FILE };
