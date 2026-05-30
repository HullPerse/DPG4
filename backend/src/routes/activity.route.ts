import { Elysia } from "elysia";
import {
  listActivity,
  getLatestActivity,
  getActivityById,
  createActivity,
} from "../services/activity.service";

import { dbPlugin } from "../plugins/db.plugin";

export const activityRoute = new Elysia({ prefix: "/activity" })
  .use(dbPlugin)
  .get("/", async ({ db, query }) =>
    listActivity(db, query.limit ? Number(query.limit) : 50),
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
  .post("/", async ({ body, db }) => createActivity(db, body));
