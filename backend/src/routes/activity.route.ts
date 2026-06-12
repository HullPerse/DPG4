import { Elysia, t } from "elysia";
import { servicesPlugin } from "../services.server";

export const activityRoute = new Elysia({ prefix: "/activity" })
  .use(servicesPlugin)
  .get(
    "/",
    async ({ query, activityService }) =>
      activityService.list(
        query.limit ? Number(query.limit) : 50,
        query.offset ? Number(query.offset) : 0,
      ),
    {
      query: t.Optional(
        t.Object({
          limit: t.Optional(t.String()),
          offset: t.Optional(t.String()),
        }),
      ),
    },
  )
  .get("/latest", async ({ activityService }) => activityService.getLatest())
  .get(
    "/:id",
    async ({ params, activityService, set }) => {
      const row = await activityService.getById(params.id);
      if (!row) {
        set.status = 404;
        return { error: "Not found" };
      }
      return row;
    },
    { params: t.Object({ id: t.String() }) },
  )
  .post(
    "/",
    async ({ body, activityService }) => activityService.create(body),
    {
      body: t.Object({
        text: t.String(),
        author: t.Optional(t.String()),
        image: t.Optional(t.String()),
        type: t.Optional(t.String()),
      }),
    },
  );
