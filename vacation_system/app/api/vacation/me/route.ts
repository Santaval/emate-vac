import { withAuth, unauthorizedResponse, AuthError } from "@/lib/withAuth";
import {
  findOrCreateUser,
  findUserRoles,
} from "@/modules/vacation/repositories/userRoleRepository";

export async function GET(request: Request) {
  try {
    const claims = await withAuth(request);
    const user = await findOrCreateUser({
      username: claims.preferred_username ?? claims.sub,
      email: claims.email,
      nombre: claims.name ?? claims.preferred_username ?? claims.sub,
    });
    const roles = await findUserRoles(user.id);
    return Response.json({ roles });
  } catch (e) {
    if (e instanceof AuthError) return unauthorizedResponse();
    throw e;
  }
}
