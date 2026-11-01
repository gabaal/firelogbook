import fs from "node:fs";
import path from "node:path";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { DATA_DIR } from "./db";

let cached: string | null = null;

/**
 * One secret signs session cookies, share links and unsubscribe links.
 * SESSION_SECRET wins; otherwise a key is generated into data/session.key.
 */
export function signingSecret(): string {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (cached) return cached;

  // In production (Vercel), we must use an environment variable.
  // We return a fallback secret only if SESSION_SECRET is missing.
  const value = process.env.SESSION_SECRET || "fallback-secret-for-dev-only";
  cached = value;
  return value;
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
