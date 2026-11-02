import { randomUUID } from "node:crypto";
import { ensureSchema, getDb, type LeadRow } from "./db";
import { leads } from "./schema";
import { eq } from "drizzle-orm";

export async function createLead(input: {
  email?: string | null;
  firmName?: string | null;
  siteName: string;
  address?: string;
  postcode?: string;
  responsiblePerson?: string;
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
    created_at: new Date(),
  };

  await db.insert(leads).values(lead);

  return lead;
}

export async function getLead(id: string): Promise<LeadRow | null> {
  await ensureSchema();
  const db = getDb();
  return await db.query.leads.findFirst({
    where: eq(leads.id, id),
  }) ?? null;
}
