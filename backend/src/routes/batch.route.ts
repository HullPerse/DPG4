import { Elysia, t } from "elysia";
import { authPlugin, databasePlugin } from "@/plugins/index.plugin";

export default new Elysia({ prefix: "/batch" })
  .use(databasePlugin)
  .use(authPlugin)
  .post(
    "/",
    async ({ body, db }) => {
      const base = Bun.env.CORS_ORIGIN ?? `http://127.0.0.1:${Bun.env.PORT ?? 200}`;
      const results = [];

      for (const req of body.requests) {
        try {
          const res = await fetch(`${base}${req.path}`, {
            method: req.method ?? "GET",
            headers: { "Content-Type": "application/json" },
            body: req.body ? JSON.stringify(req.body) : undefined,
          });
          results.push({
            path: req.path,
            ok: res.ok,
            status: res.status,
            data: await res.json().catch(() => null),
          });
        } catch {
          results.push({ path: req.path, ok: false, status: 0, data: null });
        }
      }

      return { results };
    },
    {
      body: t.Object({
        requests: t.Array(
          t.Object({
            path: t.String(),
            method: t.Optional(t.String()),
            body: t.Optional(t.Any()),
          }),
        ),
      }),
      requireAuth: true,
    },
  );
