import { isDevAuthEnabled, signDevToken } from "@/lib/devAuth";
import {
  findOrCreateUser,
  setUserRoles,
} from "@/modules/vacation/repositories/userRoleRepository";
import type { vac_rol_enum } from "@/app/generated/prisma/client";

const VALID_ROLES: vac_rol_enum[] = [
  "Profesor",
  "Jefe_de_Departamento",
  "Jefe_Administrativo",
  "Director_de_Escuela",
];

export async function POST(request: Request) {
  // In production this route does not exist.
  if (!isDevAuthEnabled()) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  if (!username) {
    return Response.json({ error: "username requerido" }, { status: 400 });
  }

  const requestedRoles: unknown = body?.roles;
  if (!Array.isArray(requestedRoles)) {
    return Response.json({ error: "roles debe ser un arreglo" }, { status: 400 });
  }
  const invalid = requestedRoles.filter((r) => !VALID_ROLES.includes(r as vac_rol_enum));
  if (invalid.length > 0) {
    return Response.json(
      { error: `roles inválidos: ${invalid.join(", ")}` },
      { status: 400 }
    );
  }
  const roles = requestedRoles as vac_rol_enum[];

  const user = await findOrCreateUser({
    username,
    email: `${username}@example.com`,
    nombre: username,
  });
  await setUserRoles(user.id, roles);

  const token = await signDevToken({ username });
  return Response.json({ token });
}
