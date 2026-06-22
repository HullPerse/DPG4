import { db } from "@/db/index.db";
import { Elysia } from "elysia";

const databasePlugin = new Elysia({ name: "db" }).decorate("db", db);
export default databasePlugin;
