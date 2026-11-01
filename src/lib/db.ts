import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import * as leadsSchema from './schema-leads';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema: { ...schema, ...leadsSchema } });

export const DATA_DIR = "/tmp/data";
export const UPLOAD_DIR = "/tmp/uploads";

export function getDb() {
  return db;
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
export type LeadRow = typeof leadsSchema.leads.$inferSelect;
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "demo";

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
