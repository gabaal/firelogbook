import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { seedIfEmpty, ensureDemoAccount } from "./seed";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "demo";

export interface FirmRow {
  id: string;
  name: string;
  created_at: string;
  subscription_status: SubscriptionStatus;
  plan_interval: "month" | "year" | null;
  trial_ends_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  reminders_enabled: number;
  /** ISO weekday, 1 = Monday. */
  reminder_day: number;
  reminder_hour: number;
}

export interface UserRow {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface MembershipRow {
  id: string;
  user_id: string;
  firm_id: string;
  role: "owner" | "admin" | "member";
  created_at: string;
}

export interface ChecklistItemRow {
  id: string;
  site_id: string;
  key: string;
  title: string;
  guidance: string;
  frequency: string;
  ref: string;
  created_at: string;
}

export interface SessionRow {
  id: string;
  user_id: string;
  firm_id: string;
  expires_at: string;
  created_at: string;
}

export interface SiteRow {
  id: string;
  firm_id: string;
  name: string;
  address: string;
  postcode: string;
  responsible_person: string;
  responsible_email: string;
  remind_opt_out: number;
  working_days: string;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  firm_id: string;
  site_id: string;
  level: number;
  week_key: string;
  to_addr: string;
  subject: string;
  body: string;
  channel: string;
  status: "pending" | "sent" | "outbox" | "failed";
  error: string | null;
  created_at: string;
}

export interface CheckRow {
  id: string;
  site_id: string;
  item_key: string;
  performed_at: string;
  performed_by: string;
  result: "pass" | "fail" | "na";
  note: string | null;
  photo: string | null;
  created_at: string;
}

export interface ActionRow {
  id: string;
  site_id: string;
  check_id: string | null;
  title: string;
  detail: string | null;
  due_date: string | null;
  status: "open" | "closed";
  created_at: string;
  closed_at: string | null;
  closed_note: string | null;
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS firms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS sites (
    id TEXT PRIMARY KEY,
    firm_id TEXT NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT NOT NULL DEFAULT '',
    postcode TEXT NOT NULL DEFAULT '',
    responsible_person TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS checks (
    id TEXT PRIMARY KEY,
    site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    item_key TEXT NOT NULL,
    performed_at TEXT NOT NULL,
    performed_by TEXT NOT NULL DEFAULT '',
    result TEXT NOT NULL,
    note TEXT,
    photo TEXT,
    created_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_checks_site_time ON checks(site_id, performed_at DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_checks_item ON checks(site_id, item_key, performed_at DESC);`,
  `CREATE TABLE IF NOT EXISTS checklist_items (
    id TEXT PRIMARY KEY,
    site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    title TEXT NOT NULL,
    guidance TEXT NOT NULL,
    frequency TEXT NOT NULL,
    ref TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(site_id, key)
  );`,
  `CREATE INDEX IF NOT EXISTS idx_checklist_site ON checklist_items(site_id);`,
  `CREATE TABLE IF NOT EXISTS actions (
    id TEXT PRIMARY KEY,
    site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    check_id TEXT,
    title TEXT NOT NULL,
    detail TEXT,
    due_date TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    created_at TEXT NOT NULL,
    closed_at TEXT,
    closed_note TEXT
  );`,
  `CREATE INDEX IF NOT EXISTS idx_actions_site ON actions(site_id, status);`,
  `CREATE TABLE IF NOT EXISTS email_log (
    id TEXT PRIMARY KEY,
    firm_id TEXT,
    to_addr TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    created_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS memberships (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    firm_id TEXT NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'owner',
    created_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_memberships_firm ON memberships(firm_id);`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    firm_id TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_firm ON sessions(firm_id);`,
  `CREATE TABLE IF NOT EXISTS login_tokens (
    token TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS outbox (
    id TEXT PRIMARY KEY,
    to_addr TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    firm_id TEXT NOT NULL,
    site_id TEXT NOT NULL,
    level INTEGER NOT NULL,
    week_key TEXT NOT NULL,
    to_addr TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    channel TEXT NOT NULL,
    status TEXT NOT NULL,
    error TEXT,
    created_at TEXT NOT NULL,
    UNIQUE(site_id, level, week_key)
  );`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_firm ON notifications(firm_id, created_at DESC);`,
  `CREATE TABLE IF NOT EXISTS invites (
    id TEXT PRIMARY KEY,
    firm_id TEXT NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_invites_email ON invites(email);`,
  `CREATE INDEX IF NOT EXISTS idx_invites_token ON invites(token);`,
  `CREATE TABLE IF NOT EXISTS pdf_jobs (
    id TEXT PRIMARY KEY,
    site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    params TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    file_path TEXT,
    created_at TEXT NOT NULL,
    completed_at TEXT
  );`,
  `CREATE INDEX IF NOT EXISTS idx_pdf_jobs_status ON pdf_jobs(status);`,
  `CREATE INDEX IF NOT EXISTS idx_pdf_jobs_site ON pdf_jobs(site_id);`
];

/** Columns added after the first release, applied idempotently. */
const ADDED_COLUMNS: Record<string, Record<string, string>> = {
  firms: {
    subscription_status: "TEXT NOT NULL DEFAULT 'trialing'",
    plan_interval: "TEXT",
    trial_ends_at: "TEXT",
    stripe_customer_id: "TEXT",
    stripe_subscription_id: "TEXT",
    current_period_end: "TEXT",
    reminders_enabled: "INTEGER NOT NULL DEFAULT 1",
    reminder_day: "INTEGER NOT NULL DEFAULT 1",
    reminder_hour: "INTEGER NOT NULL DEFAULT 7",
  },
  sites: {
    responsible_email: "TEXT NOT NULL DEFAULT ''",
    remind_opt_out: "INTEGER NOT NULL DEFAULT 0",
    working_days: "TEXT NOT NULL DEFAULT '1,2,3,4,5'",
  },
  checklist_items: {
    // No columns to add yet
  },
};

function migrate(db: DatabaseSync) {
  for (const [table, columns] of Object.entries(ADDED_COLUMNS)) {
    const query = "PRAGMA table_info(" + table + ")";
    const rows = db.prepare(query).all();
    const existing = new Set((rows as any[]).map((c) => c.name));
    for (const [name, definition] of Object.entries(columns)) {
      if (!existing.has(name)) {
        const alterSql = "ALTER TABLE " + table + " ADD COLUMN " + name + " " + definition;
        db.exec(alterSql);
      }
    }
  }
}

export const DATA_DIR = path.join(process.cwd(), "data");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

type Global = typeof globalThis & { __firelogbookDb?: DatabaseSync };

function open(): DatabaseSync {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const db = new DatabaseSync(path.join(DATA_DIR, "firelogbook.db"));
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  SCHEMA.forEach(sql => db.exec(sql));
  migrate(db);
  seedIfEmpty(db);
  ensureDemoAccount(db);
  return db;
}

export function getDb(): DatabaseSync {
  const g = globalThis as Global;
  if (!g.__firelogbookDb) g.__firelogbookDb = open();
  return g.__firelogbookDb;
}
