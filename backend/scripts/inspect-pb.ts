import { Database } from "bun:sqlite";

const path = process.argv[2] ?? "../old backend/pb_data/data.db";
const pb = new Database(path, { readonly: true });

const tables = pb
  .query(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`)
  .all() as { name: string }[];

console.log(
  "tables:",
  tables.map((t) => t.name).filter((n) => !n.startsWith("_")),
);

try {
  const cols = pb.query(`SELECT id, name, type FROM _collections`).all();
  console.log("collections:", cols);
} catch (e) {
  console.log("_collections error", e);
}
