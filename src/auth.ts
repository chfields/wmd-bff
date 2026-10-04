/** Session tokens: HS256 JWTs signed with AUTH_SECRET. The demo has one seeded user. */
import { createHmac, timingSafeEqual } from "node:crypto";

export interface User {
  id: string;
  email: string;
  name: string;
}

const TOKEN_TTL_SECONDS = 12 * 60 * 60;

const base64url = (value: Buffer | string): string => Buffer.from(value).toString("base64url");

function signature(secret: string, data: string): string {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

export function signToken(secret: string, user: User, now = Date.now()): string {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const issuedAt = Math.floor(now / 1000);
  const payload = base64url(
    JSON.stringify({ sub: user.id, email: user.email, name: user.name, iat: issuedAt, exp: issuedAt + TOKEN_TTL_SECONDS }),
  );
  return `${header}.${payload}.${signature(secret, `${header}.${payload}`)}`;
}

/** The token's user, or null when it is malformed, forged or expired. */
export function verifyToken(secret: string, token: string, now = Date.now()): User | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, sig] = parts as [string, string, string];
  const expected = Buffer.from(signature(secret, `${header}.${payload}`));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<string, unknown>;
    if (typeof claims.exp !== "number" || claims.exp * 1000 <= now) return null;
    if (typeof claims.sub !== "string" || typeof claims.email !== "string" || typeof claims.name !== "string") return null;
    return { id: claims.sub, email: claims.email, name: claims.name };
  } catch {
    return null;
  }
}

/** Constant-time string comparison for the password check. */
export function sameSecret(a: string, b: string): boolean {
  const left = createHmac("sha256", "compare").update(a).digest();
  const right = createHmac("sha256", "compare").update(b).digest();
  return timingSafeEqual(left, right);
}
