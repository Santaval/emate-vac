import { SignJWT } from "jose";

/**
 * Dev-only auth helpers. These exist so a developer running the app standalone
 * (outside the production parent iframe) can mint a bypass token without manual
 * console pasting. They MUST never be reachable in production.
 */

export function isDevAuthEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.BYPASS_AUTH === "true";
}

/**
 * Mints an HS256 JWT signed with BYPASS_AUTH_SECRET, matching the bypass path in
 * lib/auth.ts. Mirrors the signing used by scripts/dev-token.mjs.
 */
export async function signDevToken({ username }: { username: string }): Promise<string> {
  const secret = process.env.BYPASS_AUTH_SECRET;
  if (!secret) {
    throw new Error("BYPASS_AUTH_SECRET is not set");
  }

  return new SignJWT({
    preferred_username: username,
    email: `${username}@example.com`,
    name: username,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(username)
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(new TextEncoder().encode(secret));
}
