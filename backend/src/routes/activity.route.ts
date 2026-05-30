import { Elysia, t } from "elysia";
import {
  listActivity,
  getLatestActivity,
  getActivityById,
  createActivity,
} from "../services/activity.service";

import { dbPlugin } from "../plugins/db.plugin";

export const activityRoute = new Elysia({ prefix: "/activity" })
  .use(dbPlugin)
  .get(
    "/",
    async ({ db, query }) =>
      listActivity(
        db,
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
  .get("/latest", async ({ db }) => getLatestActivity(db))
  .get("/:id", async ({ params, db, set }) => {
    const row = await getActivityById(db, params.id);
    if (!row) {
      set.status = 404;
      return { error: "Not found" };
    }
    return row;
  })
  .post(
    "/",
    async ({ body, db }) => createActivity(db, body),
    {
      body: t.Object({
        text: t.String(),
        author: t.Optional(t.String()),
        image: t.Optional(t.String()),
        type: t.Optional(t.String()),
      }),
    },
  );
