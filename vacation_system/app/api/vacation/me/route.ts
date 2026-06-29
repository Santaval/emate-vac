import { unauthorizedResponse, AuthError } from "@/lib/withAuth";
import { authenticate } from "@/modules/vacation/auth/authenticate";

export async function GET(request: Request) {
  try {
    const { claims, user, roles } = await authenticate(request);
    return Response.json({ user, roles, claims });
  } catch (e) {
    if (e instanceof AuthError) return unauthorizedResponse();
    throw e;
  }
}
