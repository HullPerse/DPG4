import { Elysia } from "elysia";
import { gzipSync, brotliCompressSync } from "node:zlib";

const MIN_COMPRESS_SIZE = 1024;

export const compressionPlugin = new Elysia({ name: "compression" })
  .mapResponse({ as: "global" }, ({ response, request }) => {
    const body = response instanceof Response ? null : response;
    if (!body) return;

    const accept = request.headers.get("accept-encoding");
    if (!accept) return;

    const raw =
      typeof body === "string"
        ? body
        : typeof body === "object" && body !== null
          ? JSON.stringify(body)
          : null;

    if (!raw || raw.length < MIN_COMPRESS_SIZE) return;

    if (accept.includes("br")) {
      return new Response(brotliCompressSync(Buffer.from(raw)), {
        headers: {
          "Content-Type": "application/json",
          "Content-Encoding": "br",
          "Vary": "Accept-Encoding",
        },
      });
    }

    if (accept.includes("gzip")) {
      return new Response(gzipSync(Buffer.from(raw)), {
        headers: {
          "Content-Type": "application/json",
          "Content-Encoding": "gzip",
          "Vary": "Accept-Encoding",
        },
      });
    }
  });
