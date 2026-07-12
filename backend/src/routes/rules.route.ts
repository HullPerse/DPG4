import { databasePlugin } from "@/plugins/index.plugin";
import servicesPlugin from "@/services.server";
import Elysia from "elysia";
import * as schema from "@/db/schema.db";
import { withRecordMeta } from "@/lib/index.utils";

export default new Elysia({ prefix: "/rules" })
  .use(databasePlugin)
  .use(servicesPlugin)
  .get("/", async ({ db }) => {
    let q = db.select().from(schema.rules);

    const rows = await q;

    return rows.map((r) => withRecordMeta(r, "rules"));
  });
