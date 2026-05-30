import { Database } from "bun:sqlite";
import sharp from "sharp";

const db = new Database("data/db.sqlite");

interface TableDef {
  name: string;
  mimeField: string;
  process: "square" | "webp90";
}

const TABLES: TableDef[] = [
  { name: "items", mimeField: "image_mime", process: "square" },
  { name: "inventory", mimeField: "image_mime", process: "square" },
  { name: "market", mimeField: "image_mime", process: "square" },
  { name: "games", mimeField: "image_mime", process: "webp90" },
  { name: "chats", mimeField: "image_mime", process: "webp90" },
  { name: "ads", mimeField: "image_mime", process: "webp90" },
  { name: "drawings", mimeField: "image_mime", process: "webp90" },
];

function processImage(buffer: Buffer, mode: "square" | "webp90") {
  if (mode === "square") {
    return sharp(buffer)
      .resize(215, 215, { fit: "cover", position: "center" })
      .webp({ quality: 80 })
      .toBuffer();
  }
  return sharp(buffer).webp({ quality: 90 }).toBuffer();
}

async function processTable(table: TableDef) {
  const rows = db
    .query(`SELECT id, image, ${table.mimeField} as mime FROM ${table.name} WHERE image IS NOT NULL`)
    .all() as { id: string; image: Buffer | null; mime: string | null }[];

  if (rows.length === 0) {
    console.log(`  ${table.name}: no images`);
    return;
  }

  const modeLabel = table.process === "square" ? "215x215 WebP q80" : "WebP q90";
  const update = db.prepare(`UPDATE ${table.name} SET image = ?, ${table.mimeField} = 'image/webp' WHERE id = ?`);

  let ok = 0;
  let skip = 0;
  let err = 0;

  for (const row of rows) {
    if (!row.image) { skip++; continue; }
    try {
      const compressed = await processImage(row.image, table.process);
      update.run(compressed, row.id);
      ok++;
      if (ok % 10 === 0) process.stdout.write(".");
    } catch (e) {
      console.error(`\n  Error on ${table.name}.${row.id}: ${e}`);
      err++;
    }
  }

  console.log(`  ${table.name}: ${ok} compressed (${modeLabel}), ${skip} skipped, ${err} errors`);
}

console.log("Compressing all images...");
for (const table of TABLES) {
  await processTable(table);
}
console.log("\nDone!");
