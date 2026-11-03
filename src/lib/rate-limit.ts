import { sql } from "drizzle-orm";
import { ensureSchema, getDb } from "./db";
import * as schema from "./schema";

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Fixed-window rate limit backed by Postgres, so the count is shared by every
 * serverless instance rather than living in one process's memory. The key is
 * the whole scope, e.g. `lead:203.0.113.4` or `auth:request:203.0.113.4`.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  await ensureSchema();
  const db = getDb();
  const now = new Date();
  const cutoff = new Date(now.getTime() - windowMs);

  // One atomic upsert: reset when the stored window has expired, otherwise
  // increment. Two concurrent requests cannot both see the same old count.
  const rows = await db
    .insert(schema.rate_limits)
    .values({ key, window_start: now, count: 1 })
    .onConflictDoUpdate({
      target: schema.rate_limits.key,
      set: {
        count: sql`CASE WHEN ${schema.rate_limits.window_start} <= ${cutoff} THEN 1 ELSE ${schema.rate_limits.count} + 1 END`,
        window_start: sql`CASE WHEN ${schema.rate_limits.window_start} <= ${cutoff} THEN ${now} ELSE ${schema.rate_limits.window_start} END`,
      },
    })
    .returning({
      count: schema.rate_limits.count,
      windowStart: schema.rate_limits.window_start,
    });

  const row = rows[0];
  const count = Number(row?.count ?? 1);
  const windowStart = row?.windowStart ? new Date(row.windowStart) : now;
  const resetAt = windowStart.getTime() + windowMs;

  return {
    allowed: count <= limit,
    limit,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now.getTime()) / 1000)),
  };
}

/** The client address Vercel records for the request. Prefer x-real-ip: it is
 * set by the edge and cannot be chosen by the caller. */
export function clientIp(req: Request): string {
  return (
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "local"
  );
}

/** Removes old windows; the daily reminder cron calls this. */
export async function cleanupRateLimits(maxAgeMs = 7 * 86_400_000): Promise<void> {
  await ensureSchema();
  const db = getDb();
  const cutoff = new Date(Date.now() - maxAgeMs);
  await db
    .delete(schema.rate_limits)
    .where(sql`${schema.rate_limits.window_start} < ${cutoff}`);
}
