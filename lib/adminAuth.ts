import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { optionalEnv } from "./env";

const COOKIE_NAME = "or_admin_session";
const MAX_AGE_SECONDS = 60 * 60 * 12;

function sign(value: string) {
  return createHmac("sha256", optionalEnv("ADMIN_SESSION_SECRET", "opportunity-radar-session-secret")).update(value).digest("hex");
}

export function createAdminSessionValue(email: string) {
  const expires = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = Buffer.from(JSON.stringify({ email, expires })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyAdminSessionValue(value?: string) {
  if (!value) return false;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return false;

  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return parsed.expires > Date.now() && parsed.email === optionalEnv("ADMIN_EMAIL", "admin@example.com");
  } catch {
    return false;
  }
}

export async function isAdminRequest() {
  const cookieStore = await cookies();
  return verifyAdminSessionValue(cookieStore.get(COOKIE_NAME)?.value);
}

export async function requireAdmin() {
  const ok = await isAdminRequest();
  if (!ok) {
    throw new Error("Unauthorized");
  }
}

export { COOKIE_NAME, MAX_AGE_SECONDS };