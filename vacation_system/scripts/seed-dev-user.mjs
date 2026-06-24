// Seeds (idempotently) a dev user with roles, for local standalone development.
// Uses raw SQL via `pg` so it runs under plain `node` with no TS runner.
// Usage: node scripts/seed-dev-user.mjs [username] [role,role,...]
//   roles are the Prisma enum keys; defaults to all four.
// Example: node scripts/seed-dev-user.mjs qa.user Profesor,Jefe_Administrativo
import pg from "pg";
import { config } from "dotenv";

config();

// Prisma enum key -> Postgres vac_rol_enum value (see prisma/schema.prisma @map).
const ROLE_DB_VALUE = {
  Profesor: "Profesor",
  Jefe_de_Departamento: "Jefe de Departamento",
  Jefe_Administrativo: "Jefe Administrativo",
  Director_de_Escuela: "Director de Escuela",
};

const username = process.argv[2] || "dev.user";
const rolesArg = process.argv[3];
const roleKeys = rolesArg ? rolesArg.split(",").map((r) => r.trim()).filter(Boolean) : Object.keys(ROLE_DB_VALUE);

const invalid = roleKeys.filter((r) => !(r in ROLE_DB_VALUE));
if (invalid.length > 0) {
  console.error(`Invalid role(s): ${invalid.join(", ")}`);
  console.error(`Valid roles: ${Object.keys(ROLE_DB_VALUE).join(", ")}`);
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set in .env");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

try {
  await client.connect();
  await client.query("BEGIN");

  const { rows } = await client.query(
    `INSERT INTO usuario (username, email, nombre, activo)
     VALUES ($1, $2, $3, true)
     ON CONFLICT (username)
     DO UPDATE SET nombre = EXCLUDED.nombre, email = EXCLUDED.email
     RETURNING id`,
    [username, `${username}@example.com`, username]
  );
  const userId = rows[0].id;

  await client.query(`DELETE FROM usuario_rol WHERE id_usuario = $1`, [userId]);
  for (const key of roleKeys) {
    await client.query(
      `INSERT INTO usuario_rol (id_usuario, rol) VALUES ($1, $2::vac_rol_enum)`,
      [userId, ROLE_DB_VALUE[key]]
    );
  }

  await client.query("COMMIT");
  console.log(`Seeded user "${username}" (id=${userId}) with roles: ${roleKeys.join(", ") || "(none)"}`);
} catch (err) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("Seed failed:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
