import { verifyToken, type VacationTokenPayload } from "./auth";

export class AuthError extends Error {
  constructor(message = "Autenticación requerida") {
    super(message);
    this.name = "AuthError";
  }
}

export async function withAuth(request: Request): Promise<VacationTokenPayload> {
  const authorization = request.headers.get("authorization") ?? "";
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw new AuthError();
  }

  try {
    return await verifyToken(token);
  } catch {
    throw new AuthError();
  }
}

export function unauthorizedResponse(message = "Autenticación requerida") {
  return Response.json({ error: message }, { status: 401 });
}

export function forbiddenResponse(message = "Acceso denegado") {
  return Response.json({ error: message }, { status: 403 });
}
