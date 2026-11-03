import { createHmac, timingSafeEqual } from "node:crypto";

let cached: string | null = null;

/**
 * One secret signs session cookies, share links and unsubscribe links.
 * SESSION_SECRET is required in production (32+ characters); local development
 * falls back to a fixed key so the app runs without configuration.
 */
export function signingSecret(): string {
  const configured = process.env.SESSION_SECRET?.trim();
  if (configured) {
    if (configured.length < 32) {
      throw new Error("SESSION_SECRET must be at least 32 characters long");
    }
    return configured;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET is not set. Add a random 32+ character value to the environment.",
    );
  }

  cached ??= "fallback-secret-for-dev-only";
  return cached;
}

export function signPayload(payload: string): string {
  return createHmac("sha256", signingSecret()).update(payload).digest("base64url");
}

export function verifyPayload(payload: string, signature: string): boolean {
  const expected = Buffer.from(signPayload(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length) return false;
  return timingSafeEqual(expected, given);
}

/** Signed, URL-safe token carrying a small JSON payload. */
export function signToken(data: Record<string, unknown>): string {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  return `${payload}.${signPayload(payload)}`;
}

export function verifyToken<T>(token: string): T | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  if (!verifyPayload(payload, signature)) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString()) as T;
  } catch {
    return null;
  }
}
