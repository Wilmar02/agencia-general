import sql from "./index.js";

const META_ACCOUNTS = [
  { account_id: "act_1108611182845697", name: "Opticas OVA", currency: "COP", tipo: "whatsapp" },
  { account_id: "act_2933226120228982", name: "Proyecto Marena", currency: "COP", tipo: "leads" },
  { account_id: "act_985316322541334", name: "Porto Sabbia Suites", currency: "COP", tipo: "leads" },
  { account_id: "act_796784845977177", name: "Sindy Claro Business", currency: "COP", tipo: "whatsapp" },
  { account_id: "act_624542746688035", name: "Proyecto Coralina", currency: "COP", tipo: "leads" },
  { account_id: "act_1295716625064492", name: "Classic Metals", currency: "USD", tipo: "leads" },
  { account_id: "act_924872489712301", name: "Porto Sabbia Residences", currency: "COP", tipo: "leads" },
  { account_id: "act_1147397640776403", name: "Rodadero Living", currency: "COP", tipo: "leads" },
  { account_id: "act_2364841483675298", name: "Banana Playa", currency: "COP", tipo: "ventas" },
];

const GOOGLE_ACCOUNTS = [
  { account_id: "3510077813", name: "Porto Sabbia (Google)", currency: "COP", tipo: "leads" },
  { account_id: "4391319603", name: "Coralina (Google)", currency: "COP", tipo: "leads" },
  { account_id: "1402878956", name: "Marena (Google)", currency: "COP", tipo: "leads" },
  { account_id: "5617001129", name: "Rodadero Living (Google)", currency: "COP", tipo: "leads" },
];

async function seed() {
  for (const acc of META_ACCOUNTS) {
    await sql`
      INSERT INTO ad_accounts (platform, account_id, name, currency, tipo)
      VALUES ('meta', ${acc.account_id}, ${acc.name}, ${acc.currency}, ${acc.tipo})
      ON CONFLICT (platform, account_id) DO UPDATE SET name = ${acc.name}, active = true
    `;
  }
  for (const acc of GOOGLE_ACCOUNTS) {
    await sql`
      INSERT INTO ad_accounts (platform, account_id, name, currency, tipo)
      VALUES ('google', ${acc.account_id}, ${acc.name}, ${acc.currency}, ${acc.tipo})
      ON CONFLICT (platform, account_id) DO UPDATE SET name = ${acc.name}, active = true
    `;
  }
  console.log(`✓ ${META_ACCOUNTS.length} cuentas Meta + ${GOOGLE_ACCOUNTS.length} cuentas Google insertadas`);
  await sql.end();
}

seed().catch(console.error);
