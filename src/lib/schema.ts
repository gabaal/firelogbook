import { pgTable, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";

export const firms = pgTable("firms", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  created_at: timestamp("created_at").notNull(),
  subscription_status: text("subscription_status").notNull().default("trialing"),
  plan_interval: text("plan_interval"),
  trial_ends_at: timestamp("trial_ends_at"),
  stripe_customer_id: text("stripe_customer_id"),
  stripe_subscription_id: text("stripe_subscription_id"),
  current_period_end: timestamp("current_period_end"),
  reminders_enabled: integer("reminders_enabled").notNull().default(1),
  reminder_day: integer("reminder_day").notNull().default(1),
  reminder_hour: integer("reminder_hour").notNull().default(7),
});
export type FirmRow = typeof firms.$inferSelect;

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull().default(""),
  created_at: timestamp("created_at").notNull(),
});
export type UserRow = typeof users.$inferSelect;

export const memberships = pgTable("memberships", {
  id: text("id").primaryKey(),
  user_id: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  firm_id: text("firm_id").notNull().references(() => firms.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("owner"),
  created_at: timestamp("created_at").notNull(),
});
export type MembershipRow = typeof memberships.$inferSelect;

export const sites = pgTable("sites", {
  id: text("id").primaryKey(),
  firm_id: text("firm_id").notNull().references(() => firms.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  address: text("address").notNull().default(""),
  postcode: text("postcode").notNull().default(""),
  responsible_person: text("responsible_person").notNull().default(""),
  responsible_email: text("responsible_email").notNull().default(""),
  remind_opt_out: integer("remind_opt_out").notNull().default(0),
  working_days: text("working_days").notNull().default("1,2,3,4,5"),
  created_at: timestamp("created_at").notNull(),
});
export type SiteRow = typeof sites.$inferSelect;

export const checklist_items = pgTable("checklist_items", {
  id: text("id").primaryKey(),
  site_id: text("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  title: text("title").notNull(),
  guidance: text("guidance").notNull(),
  frequency: text("frequency").notNull(),
  ref: text("ref").notNull(),
  created_at: timestamp("created_at").notNull(),
});
export type ChecklistItemRow = typeof checklist_items.$inferSelect;

export const checks = pgTable("checks", {
  id: text("id").primaryKey(),
  site_id: text("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  item_key: text("item_key").notNull(),
  performed_at: timestamp("performed_at").notNull(),
  performed_by: text("performed_by").notNull().default(""),
  result: text("result").notNull(),
  note: text("note"),
  photo: text("photo"),
  created_at: timestamp("created_at").notNull(),
});
export type CheckRow = typeof checks.$inferSelect;

export const actions = pgTable("actions", {
  id: text("id").primaryKey(),
  site_id: text("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  check_id: text("check_id"),
  title: text("title").notNull(),
  detail: text("detail"),
  due_date: timestamp("due_date"),
  status: text("status").notNull().default("open"),
  created_at: timestamp("created_at").notNull(),
  closed_at: timestamp("closed_at"),
  closed_note: text("closed_note"),
});
export type ActionRow = typeof actions.$inferSelect;

export const email_log = pgTable("email_log", {
  id: text("id").primaryKey(),
  firm_id: text("firm_id"),
  to_addr: text("to_addr").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull().default("queued"),
  created_at: timestamp("created_at").notNull(),
});

export const invites = pgTable("invites", {
  id: text("id").primaryKey(),
  firm_id: text("firm_id").notNull().references(() => firms.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role").notNull(),
  token: text("token").notNull().unique(),
  created_at: timestamp("created_at").notNull(),
  expires_at: timestamp("expires_at").notNull(),
});

export const login_tokens = pgTable("login_tokens", {
  token: text("token").primaryKey(),
  email: text("email").notNull(),
  expires_at: timestamp("expires_at").notNull(),
  created_at: timestamp("created_at").notNull(),
  used_at: timestamp("used_at"),
});

export const rate_limits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  window_start: timestamp("window_start").notNull(),
  count: integer("count").notNull().default(0),
});

export const events = pgTable("events", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  firm_id: text("firm_id"),
  site_id: text("site_id"),
  props: text("props"),
  created_at: timestamp("created_at").notNull(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  user_id: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  firm_id: text("firm_id").notNull(),
  expires_at: timestamp("expires_at").notNull(),
  created_at: timestamp("created_at").notNull(),
});

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  firm_id: text("firm_id").notNull(),
  site_id: text("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  level: integer("level").notNull(),
  week_key: text("week_key").notNull(),
  to_addr: text("to_addr").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  channel: text("channel").notNull(),
  status: text("status").notNull(),
  error: text("error"),
  created_at: timestamp("created_at").notNull(),
});

export const pdf_jobs = pgTable("pdf_jobs", {
  id: text("id").primaryKey(),
  site_id: text("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  params: text("params").notNull(),
  status: text("status").notNull().default("queued"),
  file_path: text("file_path"),
  created_at: timestamp("created_at").notNull(),
  completed_at: timestamp("completed_at"),
});

export const leads = pgTable("leads", {
  id: text("id").primaryKey(),
  email: text("email"),
  firm_name: text("firm_name"),
  site_name: text("site_name").notNull(),
  address: text("address").notNull().default(""),
  postcode: text("postcode").notNull().default(""),
  responsible_person: text("responsible_person").notNull().default(""),
  source: text("source").notNull().default("free-logbook"),
  marketing_consent: integer("marketing_consent").notNull().default(0),
  nurture_opt_out: integer("nurture_opt_out").notNull().default(0),
  converted_at: timestamp("converted_at"),
  created_at: timestamp("created_at").notNull(),
});
export type LeadRow = typeof leads.$inferSelect;

export const lead_nurture = pgTable("lead_nurture", {
  id: text("id").primaryKey(),
  lead_id: text("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  step: integer("step").notNull(),
  status: text("status").notNull(),
  created_at: timestamp("created_at").notNull(),
});
export type LeadNurtureRow = typeof lead_nurture.$inferSelect;

export const outbox = pgTable("outbox", {
  id: text("id").primaryKey(),
  to_addr: text("to_addr").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  created_at: timestamp("created_at").notNull(),
});

/**
 * Fallback photo store used when Vercel Blob is not configured. `data` is a
 * base64 JPEG/PNG; `photoUrl()` maps `db:<id>` to /api/photos/[id].
 */
export const check_photos = pgTable("check_photos", {
  id: text("id").primaryKey(),
  site_id: text("site_id").notNull(),
  content_type: text("content_type").notNull(),
  data: text("data").notNull(),
  created_at: timestamp("created_at").notNull(),
});
