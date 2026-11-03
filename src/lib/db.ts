import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";
import * as schema from "./schema";
import { MIGRATIONS } from "./migrations";

export const DATA_DIR = "/tmp/data";
export const UPLOAD_DIR = "/tmp/uploads";

type Database = NeonHttpDatabase<typeof schema>;

function connectionString(): string | undefined {
  return process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? undefined;
}

let instance: Database | undefined;

function createDb(): Database {
  const url = connectionString();
  if (!url) {
    throw new Error(
      "Database is not configured. Set DATABASE_URL (or POSTGRES_URL) to the Neon connection string.",
    );
  }
  return drizzle(neon(url), { schema });
}

export function getDb(): Database {
  if (!instance) instance = createDb();
  return instance;
}

/**
 * The app imports `db` directly in several places, so keep that export while
 * connecting lazily: importing this module must not throw at build time when
 * the environment has no database URL yet.
 */
export const db: Database = new Proxy({} as Database, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real as object, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

let schemaReady: Promise<void> | null = null;

/** Two cold instances can race on the same DDL; treat that as success. */
function alreadyApplied(error: unknown): boolean {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";
  const message = error instanceof Error ? error.message : String(error);
  return (
    code === "42P07" || // duplicate table
    code === "42710" || // duplicate object (index/constraint)
    code === "23505" || // duplicate key
    /already exists/i.test(message)
  );
}

/**
 * Applies any unapplied migration from `src/lib/migrations.ts`, once per
 * process, and records it in `schema_migrations`. Each statement is
 * idempotent, so a migration interrupted halfway is safe to retry.
 */
export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const database = getDb();

      await database.execute(sql.raw(`CREATE TABLE IF NOT EXISTS schema_migrations (
        id text PRIMARY KEY,
        applied_at timestamp NOT NULL
      )`));

      const applied = await database
        .select({ id: schema.schema_migrations.id })
        .from(schema.schema_migrations);
      const done = new Set(applied.map((row) => row.id));

      for (const migration of MIGRATIONS) {
        if (done.has(migration.id)) continue;

        for (const statement of migration.statements) {
          try {
            await database.execute(sql.raw(statement));
          } catch (error) {
            if (alreadyApplied(error)) continue;
            throw error;
          }
        }

        await database
          .insert(schema.schema_migrations)
          .values({ id: migration.id, applied_at: new Date() })
          .onConflictDoNothing();
      }
    })().catch((error) => {
      // Let the next request retry rather than caching the failure forever.
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

// Type aliases to maintain compatibility with the rest of the app
export type FirmRow = typeof schema.firms.$inferSelect;
export type UserRow = typeof schema.users.$inferSelect;
export type MembershipRow = typeof schema.memberships.$inferSelect;
export type ChecklistItemRow = typeof schema.checklist_items.$inferSelect;
export type SessionRow = typeof schema.sessions.$inferSelect;
export type SiteRow = typeof schema.sites.$inferSelect;
export type NotificationRow = typeof schema.notifications.$inferSelect;
export type CheckRow = typeof schema.checks.$inferSelect;
export type ActionRow = typeof schema.actions.$inferSelect;
export type LeadRow = typeof schema.leads.$inferSelect;
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "demo";
