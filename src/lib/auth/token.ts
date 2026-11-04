import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * The session for the team's dashboard. One shared password signs a person in; the browser then holds a signed cookie with an
 * expiry. Pure: no environment reads, no network, no writes, so each rule can be tested directly.
 */

export const SESSION_COOKIE = "ecom_session";
/** After this long the team signs in again. */
export const SESSION_LIFETIME_SECONDS = 12 * 60 * 60;
export const MIN_PASSWORD_LENGTH = 12;
export const MIN_SECRET_LENGTH = 32;
const TOKEN_VERSION = "v1";

export interface IssuedSession {
  token: string;
  expiresAt: number;
}

function sign(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/** A new session token. The expiry is inside the signed part, so it cannot be extended by editing the cookie. */
export function issueSession(secret: string, nowSeconds: number, lifetimeSeconds: number = SESSION_LIFETIME_SECONDS): IssuedSession {
  const expiresAt = nowSeconds + lifetimeSeconds;
  const payload = `${TOKEN_VERSION}.${expiresAt}`;
  return { token: `${payload}.${sign(secret, payload)}`, expiresAt };
}

/** True when the token is signed with this secret and has not expired. */
export function isSessionValid(token: string | null | undefined, secret: string, nowSeconds: number): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== TOKEN_VERSION) return false;
  const expiresAt = Number(parts[1]);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= nowSeconds) return false;
  const expected = Buffer.from(sign(secret, `${parts[0]}.${parts[1]}`), "utf8");
  const given = Buffer.from(parts[2], "utf8");
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Compares two passwords in constant time. Both are hashed first, so the comparison always has equal lengths. */
export function passwordMatches(candidate: string, expected: string): boolean {
  const a = createHash("sha256").update(candidate, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

/**
 * Why sign-in cannot work yet, or null when the settings are usable. The reason is for the server log only: a visitor sees a
 * generic message, so the public page never names the settings.
 */
export function authConfigProblem(password: string | undefined, secret: string | undefined): string | null {
  if (!password) return "DASHBOARD_PASSWORD is not set";
  if (password.length < MIN_PASSWORD_LENGTH) return `DASHBOARD_PASSWORD is shorter than ${MIN_PASSWORD_LENGTH} characters`;
  if (!secret) return "SESSION_SECRET is not set";
  if (secret.length < MIN_SECRET_LENGTH) return `SESSION_SECRET is shorter than ${MIN_SECRET_LENGTH} characters`;
  return null;
}

/**
 * Where to send a person after signing in. Only a path inside this site is allowed: an absolute or protocol-relative URL, or a
 * backslash trick, falls back to the dashboard. The login page itself is never a target, so sign-in cannot loop.
 */
export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  if (/[\r\n]/.test(value)) return "/";
  const base = "https://same-site.invalid";
  const resolved = new URL(value, base);
  if (resolved.origin !== base) return "/";
  if (resolved.pathname === "/login" || resolved.pathname.startsWith("/api/")) return "/";
  return `${resolved.pathname}${resolved.search}`;
}
