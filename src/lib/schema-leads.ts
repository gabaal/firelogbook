import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const leads = pgTable("leads", {
  id: text("id").primaryKey(),
  email: text("email"),
  firm_name: text("firm_name"),
  site_name: text("site_name").notNull(),
  address: text("address").notNull().default(""),
  postcode: text("postcode").notNull().default(""),
  responsible_person: text("responsible_person").notNull().default(""),
  source: text("source").notNull().default("free-logbook"),
  created_at: timestamp("created_at").notNull(),
});

export type LeadRow = typeof leads.$inferSelect;
