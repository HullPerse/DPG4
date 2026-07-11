import { Elysia } from "elysia";

const MIN_COMPRESS_SIZE = 1024;

const compressionPlugin = new Elysia({
  name: "compression",
}).mapResponse("global", ({ responseValue, request }) => {
  const body = responseValue instanceof Response ? null : responseValue;
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

  if (accept.includes("gzip")) {
    return new Response(Bun.gzipSync(raw), {
      headers: {
        "Content-Type": "application/json",
        "Content-Encoding": "gzip",
        Vary: "Accept-Encoding",
      },
    });
  }
});

export default compressionPlugin;
