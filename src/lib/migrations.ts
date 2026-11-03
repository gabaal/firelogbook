/**
 * Versioned schema migrations. `ensureSchema()` applies any migration whose id
 * is not yet in `schema_migrations`, once per process.
 *
 * Rules:
 *  - Never edit a migration that has shipped; append a new one instead.
 *  - Statements should be idempotent (`IF NOT EXISTS`, `ADD COLUMN IF NOT
 *    EXISTS`) so a partially applied migration can safely be retried.
 */
export interface Migration {
  id: string;
  statements: string[];
}

export const MIGRATIONS: Migration[] = [
  {
    id: "0001_initial_schema",
    statements: [
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
      `CREATE TABLE IF NOT EXISTS leads (
        id text PRIMARY KEY,
        email text,
        firm_name text,
        site_name text NOT NULL,
        address text NOT NULL DEFAULT '',
        postcode text NOT NULL DEFAULT '',
        responsible_person text NOT NULL DEFAULT '',
        source text NOT NULL DEFAULT 'free-logbook',
        marketing_consent integer NOT NULL DEFAULT 0,
        nurture_opt_out integer NOT NULL DEFAULT 0,
        converted_at timestamp,
        created_at timestamp NOT NULL
      )`,
      // Tables created before the nurture fields existed.
      `ALTER TABLE leads ADD COLUMN IF NOT EXISTS marketing_consent integer NOT NULL DEFAULT 0`,
      `ALTER TABLE leads ADD COLUMN IF NOT EXISTS nurture_opt_out integer NOT NULL DEFAULT 0`,
      `ALTER TABLE leads ADD COLUMN IF NOT EXISTS converted_at timestamp`,
      `CREATE TABLE IF NOT EXISTS lead_nurture (
        id text PRIMARY KEY,
        lead_id text NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        step integer NOT NULL,
        status text NOT NULL,
        created_at timestamp NOT NULL,
        UNIQUE(lead_id, step)
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
    ],
  },
  {
    id: "0002_drop_unused_pdf_jobs",
    statements: [`DROP TABLE IF EXISTS pdf_jobs`],
  },
];
