import { jwtVerify, createRemoteJWKSet } from "jose";
import type { JWTPayload } from "jose";

export interface VacationTokenPayload extends JWTPayload {
  sub: string;
  preferred_username?: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
}

const bypassAuth = process.env.BYPASS_AUTH === "true";
const bypassSecret = new TextEncoder().encode(
  process.env.BYPASS_AUTH_SECRET || "dev-secret-change-in-env"
);

const keycloakUrl = process.env.KEYCLOAK_URL || "http://localhost:8080";
const keycloakRealm = process.env.KEYCLOAK_REALM || "dev";
const issuer = `${keycloakUrl}/realms/${keycloakRealm}`;
const jwksUri = `${keycloakUrl}/realms/${keycloakRealm}/protocol/openid-connect/certs`;

// Lazily created so the URL is only fetched when actually needed (not at import time in dev)
let JWKS: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJWKS() {
  if (!JWKS) JWKS = createRemoteJWKSet(new URL(jwksUri));
  return JWKS;
}

export async function verifyToken(token: string): Promise<VacationTokenPayload> {
  if (bypassAuth) {
    const { payload } = await jwtVerify<VacationTokenPayload>(token, bypassSecret);
    return payload;
  }

  const { payload } = await jwtVerify<VacationTokenPayload>(token, getJWKS(), {
    issuer,
    algorithms: ["RS256"],
  });
  return payload;
}
