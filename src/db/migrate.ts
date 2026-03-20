import sql from "./index.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const schema = readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
  await sql.unsafe(schema);

  // Add missing columns to campaigns_daily (idempotent)
  const addCol = async (col: string, type: string, def: string) => {
    await sql.unsafe(`ALTER TABLE campaigns_daily ADD COLUMN IF NOT EXISTS ${col} ${type} DEFAULT ${def}`);
  };
  await addCol("reach", "INTEGER", "0");
  await addCol("ctr", "NUMERIC(6,4)", "0");
  await addCol("cpm", "NUMERIC(10,2)", "0");
  await addCol("cpc", "NUMERIC(10,2)", "0");
  await addCol("frequency", "NUMERIC(6,2)", "0");
  await addCol("conv_value", "NUMERIC(12,2)", "0");
  await addCol("objective", "TEXT", "NULL");

  console.log("✓ Migración completada");
  await sql.end();
}

migrate().catch(console.error);
