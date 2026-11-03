import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";
import * as schema from "./schema";

export const DATA_DIR = "/tmp/data";
export const UPLOAD_DIR = "/tmp/uploads";

/**
 * Postgres DDL for the whole schema. The SQLite build created its tables at
 * startup; the move to Neon dropped that, so a fresh database came up empty.
 * Every statement is idempotent, and `ensureSchema()` runs them once per
 * process before the first query that needs a table.
 */
const SCHEMA_SQL = [
  `CREATE TABLE IF NOT EXISTS firms (
    id text PRIMARY KEY,
    name text NOT NULL,
    created_at timestamp NOT NULL,
    subscription_status text NOT NULL DEFAULT 'trialing',
    plan_interval text,
    trial_ends_at timestamp,
    stripe_customer_id text,
    stripe_subscription_id text,
    current_period_end timestamp,
    reminders_enabled integer NOT NULL DEFAULT 1,
    reminder_day integer NOT NULL DEFAULT 1,
    reminder_hour integer NOT NULL DEFAULT 7
  )`,
  `CREATE TABLE IF NOT EXISTS users (
    id text PRIMARY KEY,
    email text NOT NULL UNIQUE,
    name text NOT NULL DEFAULT '',
    created_at timestamp NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS memberships (
    id text PRIMARY KEY,
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    firm_id text NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    role text NOT NULL DEFAULT 'owner',
    created_at timestamp NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sites (
    id text PRIMARY KEY,
    firm_id text NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    name text NOT NULL,
    address text NOT NULL DEFAULT '',
    postcode text NOT NULL DEFAULT '',
    responsible_person text NOT NULL DEFAULT '',
    responsible_email text NOT NULL DEFAULT '',
    remind_opt_out integer NOT NULL DEFAULT 0,
    working_days text NOT NULL DEFAULT '1,2,3,4,5',
    created_at timestamp NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS checklist_items (
    id text PRIMARY KEY,
    site_id text NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    key text NOT NULL,
    title text NOT NULL,
    guidance text NOT NULL,
    frequency text NOT NULL,
    ref text NOT NULL,
    created_at timestamp NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS checks (
    id text PRIMARY KEY,
    site_id text NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    item_key text NOT NULL,
    performed_at timestamp NOT NULL,
    performed_by text NOT NULL DEFAULT '',
    result text NOT NULL,
    note text,
    photo text,
    created_at timestamp NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS actions (
    id text PRIMARY KEY,
    site_id text NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    check_id text,
    title text NOT NULL,
    detail text,
    due_date timestamp,
    status text NOT NULL DEFAULT 'open',
    created_at timestamp NOT NULL,
    closed_at timestamp,
    closed_note text
  )`,
  `CREATE TABLE IF NOT EXISTS email_log (
    id text PRIMARY KEY,
    firm_id text,
    to_addr text NOT NULL,
    subject text NOT NULL,
    body text NOT NULL,
    status text NOT NULL DEFAULT 'queued',
    created_at timestamp NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS invites (
    id text PRIMARY KEY,
    firm_id text NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    email text NOT NULL,
    role text NOT NULL,
    token text NOT NULL UNIQUE,
    created_at timestamp NOT NULL,
    expires_at timestamp NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS login_tokens (
    token text PRIMARY KEY,
    email text NOT NULL,
    expires_at timestamp NOT NULL,
    created_at timestamp NOT NULL,
    used_at timestamp
  )`,
  `CREATE TABLE IF NOT EXISTS rate_limits (
    key text PRIMARY KEY,
    window_start timestamp NOT NULL,
    count integer NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS rate_limits_window_start_idx ON rate_limits (window_start)`,
  `CREATE TABLE IF NOT EXISTS events (
    id text PRIMARY KEY,
    name text NOT NULL,
    firm_id text,
    site_id text,
    props text,
    created_at timestamp NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS events_name_created_idx ON events (name, created_at)`,
  `CREATE INDEX IF NOT EXISTS events_created_idx ON events (created_at)`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id text PRIMARY KEY,
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    firm_id text NOT NULL,
    expires_at timestamp NOT NULL,
    created_at timestamp NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS notifications (
    id text PRIMARY KEY,
    firm_id text NOT NULL,
    site_id text NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    level integer NOT NULL,
    week_key text NOT NULL,
    to_addr text NOT NULL,
    subject text NOT NULL,
    body text NOT NULL,
    channel text NOT NULL,
    status text NOT NULL,
    error text,
    created_at timestamp NOT NULL,
    UNIQUE(site_id, level, week_key)
  )`,
  `CREATE TABLE IF NOT EXISTS pdf_jobs (
    id text PRIMARY KEY,
    site_id text NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    params text NOT NULL,
    status text NOT NULL DEFAULT 'queued',
    file_path text,
    created_at timestamp NOT NULL,
    completed_at timestamp
  )`,
  `CREATE TABLE IF NOT EXISTS leads (
    id text PRIMARY KEY,
    email text,
    firm_name text,
    site_name text NOT NULL,
    address text NOT NULL DEFAULT '',
    postcode text NOT NULL DEFAULT '',
    responsible_person text NOT NULL DEFAULT '',
    source text NOT NULL DEFAULT 'free-logbook',
    created_at timestamp NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS outbox (
    id text PRIMARY KEY,
    to_addr text NOT NULL,
    subject text NOT NULL,
    body text NOT NULL,
    created_at timestamp NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS check_photos (
    id text PRIMARY KEY,
    site_id text NOT NULL,
    content_type text NOT NULL,
    data text NOT NULL,
    created_at timestamp NOT NULL
  )`,
];

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

/**
 * Creates any missing tables. Safe to call on every request: the work happens
 * once per process and every statement is `IF NOT EXISTS`.
 */
export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const database = getDb();
      for (const statement of SCHEMA_SQL) {
        try {
          await database.execute(sql.raw(statement));
        } catch (error) {
          // Two cold instances can race on `CREATE TABLE IF NOT EXISTS`.
          // If the other instance won, the table exists and we can carry on.
          const code =
            error && typeof error === "object" && "code" in error
              ? String((error as { code?: unknown }).code)
              : "";
          const message = error instanceof Error ? error.message : String(error);
          if (code === "42P07" || code === "23505" || /already exists/i.test(message)) {
            continue;
          }
          throw error;
        }
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
