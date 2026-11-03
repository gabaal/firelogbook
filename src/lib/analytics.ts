import { randomUUID } from "node:crypto";
import { ensureSchema, getDb } from "./db";
import * as schema from "./schema";

/**
 * Records a product event. Deliberately best-effort: analytics must never
 * break the flow it is measuring, and it never stores emails, names or notes.
 */
export async function trackEvent(
  name: string,
  input: {
    firmId?: string | null;
    siteId?: string | null;
    props?: Record<string, unknown>;
  } = {},
): Promise<void> {
  try {
    await ensureSchema();
    await getDb()
      .insert(schema.events)
      .values({
        id: randomUUID(),
        name,
        firm_id: input.firmId ?? null,
        site_id: input.siteId ?? null,
        props: input.props ? JSON.stringify(input.props) : null,
        created_at: new Date(),
      });
  } catch (error) {
    console.error(`analytics: could not record "${name}"`, error);
  }
}

/** Cross-firm analytics are limited to the operator allowlist. */
export function isAdminEmail(email: string): boolean {
  const allowed = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}
