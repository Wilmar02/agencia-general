import sql from "./index.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function seed() {
  // Run schema
  const schema = readFileSync(path.join(__dirname, "billing-schema.sql"), "utf-8");
  await sql.unsafe(schema);

  // Yenny Solorzano — paga a Bancolombia de Wilmar
  const [yenny] = await sql`
    INSERT INTO billing_clients (name, nit, email, bank, account_type, account_number, holder, holder_doc)
    VALUES ('Yenny Solorzano', 'N/A', 'ysolorzano7@gmail.com', 'Bancolombia', 'Ahorros', '662-500-829-92', 'Wilmar Rocha Lopez', '1.019.031.051')
    ON CONFLICT DO NOTHING RETURNING id
  `;
  if (yenny) {
    await sql`INSERT INTO billing_services (client_id, description, amount, billing_day, category) VALUES
      (${yenny.id}, 'Pauta Banana Playa y Opticas OVA', 660000, 10, 'meta'),
      (${yenny.id}, 'CRM Opticas OVA', 597000, 8, 'crm')
      ON CONFLICT DO NOTHING`;
  }

  // Blue Box — paga a Nu Bank de Angela
  const [bluebox] = await sql`
    INSERT INTO billing_clients (name, nit, email, bank, account_type, account_number, holder, holder_doc)
    VALUES ('Blue Box Media Comunicaciones S.A.S.', '901335298', 'daniela.genez@agenciabluebox.com', 'NU BANK', 'Ahorros', '67603830', 'Angela Patricia Garcia Cruz', '53.131.435')
    ON CONFLICT DO NOTHING RETURNING id
  `;
  if (bluebox) {
    await sql`INSERT INTO billing_services (client_id, description, amount, billing_day, category) VALUES
      (${bluebox.id}, 'Campanas Facebook', 1500000, 15, 'meta'),
      (${bluebox.id}, 'Campanas de Google', 1500000, 15, 'google'),
      (${bluebox.id}, 'Asesoria de Campanas', 1500000, 15, 'asesoria')
      ON CONFLICT DO NOTHING`;
  }

  console.log("✓ Billing clients + services seeded");
  await sql.end();
}

seed().catch(console.error);
