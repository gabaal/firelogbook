import { randomUUID } from "node:crypto";
import { ensureSchema, getDb, type LeadRow } from "./db";
import { leads } from "./schema";
import { and, eq, isNull } from "drizzle-orm";

export async function createLead(input: {
  email?: string | null;
  firmName?: string | null;
  siteName: string;
  address?: string;
  postcode?: string;
  responsiblePerson?: string;
  marketingConsent?: boolean;
}): Promise<LeadRow> {
  await ensureSchema();
  const db = getDb();
  const lead: LeadRow = {
    id: randomUUID(),
    email: input.email?.trim().toLowerCase() || null,
    firm_name: input.firmName?.trim() || null,
    site_name: input.siteName.trim(),
    address: input.address?.trim() ?? "",
    postcode: input.postcode?.trim().toUpperCase() ?? "",
    responsible_person: input.responsiblePerson?.trim() ?? "",
    source: "free-logbook",
    marketing_consent: input.marketingConsent ? 1 : 0,
    nurture_opt_out: 0,
    converted_at: null,
    created_at: new Date(),
  };

  await db.insert(leads).values(lead);

  return lead;
}

/** Stops the nurture sequence once the lead becomes an account. */
export async function markLeadConverted(email: string): Promise<void> {
  const normalised = email.trim().toLowerCase();
  if (!normalised) return;
  await ensureSchema();
  await getDb()
    .update(leads)
    .set({ converted_at: new Date() })
    .where(and(eq(leads.email, normalised), isNull(leads.converted_at)));
}

export async function setLeadOptOut(leadId: string): Promise<void> {
  await ensureSchema();
  await getDb()
    .update(leads)
    .set({ nurture_opt_out: 1 })
    .where(eq(leads.id, leadId));
}

export async function getLead(id: string): Promise<LeadRow | null> {
  await ensureSchema();
  const db = getDb();
  return await db.query.leads.findFirst({
    where: eq(leads.id, id),
  }) ?? null;
}
