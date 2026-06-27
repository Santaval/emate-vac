import { unauthorizedResponse, AuthError } from "@/lib/withAuth";
import { authenticate } from "@/modules/vacation/auth/authenticate";

export async function GET(request: Request) {
  try {
    const { user, roles } = await authenticate(request);
    return Response.json({ id: user.id, username: user.username, roles });
  } catch (e) {
    if (e instanceof AuthError) return unauthorizedResponse();
    throw e;
  }
}
