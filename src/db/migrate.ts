import sql from "./index.js";
import { readFileSync, readdirSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function migrate() {
  // 1. Run base schema
  const schema = readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
  await sql.unsafe(schema);

  // 2. Run billing schema if exists
  const billingSchema = path.join(__dirname, "billing-schema.sql");
  if (existsSync(billingSchema)) {
    await sql.unsafe(readFileSync(billingSchema, "utf-8"));
  }

  // 3. Add missing columns to campaigns_daily (idempotent)
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

  // 4. Run numbered migrations from migrations/ directory
  const migrationsDir = path.join(__dirname, "migrations");
  if (existsSync(migrationsDir)) {
    const files = readdirSync(migrationsDir)
      .filter(f => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      try {
        const content = readFileSync(path.join(migrationsDir, file), "utf-8");
        await sql.unsafe(content);
        console.log(`  ✓ Migración ${file}`);
      } catch (err: any) {
        // Ignore "already exists" errors for idempotent migrations
        if (!err.message?.includes("already exists")) {
          console.error(`  ✗ Migración ${file}: ${err.message}`);
        } else {
          console.log(`  ⏭ Migración ${file}: ya aplicada`);
        }
      }
    }
  }

  console.log("✓ Migración completada");
  await sql.end();
}

migrate().catch(console.error);
