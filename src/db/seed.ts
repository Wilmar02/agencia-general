import sql from "./index.js";

const META_ACCOUNTS = [
  { account_id: "act_1108611182845697", name: "Opticas OVA", currency: "COP", tipo: "whatsapp" },
  { account_id: "act_2933226120228982", name: "Proyecto Marena", currency: "COP", tipo: "leads" },
  { account_id: "act_985316322541334", name: "Porto Sabbia Suites", currency: "COP", tipo: "leads" },
  { account_id: "act_1448004105771384", name: "Salguero Elite", currency: "COP", tipo: "leads" },
  { account_id: "act_1410127736539086", name: "Proyectos Venecias", currency: "COP", tipo: "leads" },
  { account_id: "act_796784845977177", name: "Sindy Claro Business", currency: "COP", tipo: "leads" },
  { account_id: "act_624542746688035", name: "Proyecto Coralina", currency: "COP", tipo: "leads" },
  { account_id: "act_1295716625064492", name: "Classic Metals", currency: "USD", tipo: "leads" },
  { account_id: "act_924872489712301", name: "Porto Sabbia Residences", currency: "COP", tipo: "leads" },
  { account_id: "act_538198898761023", name: "Salguero Elite - Urbanizadora", currency: "COP", tipo: "leads" },
  { account_id: "act_1147397640776403", name: "Rodadero Living", currency: "COP", tipo: "leads" },
  { account_id: "act_2364841483675298", name: "Banana Playa", currency: "COP", tipo: "ventas" },
];

async function seed() {
  for (const acc of META_ACCOUNTS) {
    await sql`
      INSERT INTO ad_accounts (platform, account_id, name, currency, tipo)
      VALUES ('meta', ${acc.account_id}, ${acc.name}, ${acc.currency}, ${acc.tipo})
      ON CONFLICT (platform, account_id) DO UPDATE SET name = ${acc.name}, active = true
    `;
  }
  console.log(`✓ ${META_ACCOUNTS.length} cuentas Meta insertadas`);
  await sql.end();
}

seed().catch(console.error);
