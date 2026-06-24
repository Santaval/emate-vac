// Mints a JWT signed with BYPASS_AUTH_SECRET for local dev (requires BYPASS_AUTH=true).
// Usage: node scripts/dev-token.mjs [username]
import { SignJWT } from "jose";
import { config } from "dotenv";

config();

const secret = process.env.BYPASS_AUTH_SECRET;
if (!secret) {
  console.error("BYPASS_AUTH_SECRET is not set in .env");
  process.exit(1);
}

const username = process.argv[2] || "dev.user";

const token = await new SignJWT({
  preferred_username: username,
  email: `${username}@example.com`,
  name: username,
})
  .setProtectedHeader({ alg: "HS256" })
  .setSubject(username)
  .setIssuedAt()
  .setExpirationTime("8h")
  .sign(new TextEncoder().encode(secret));

console.log(token);
