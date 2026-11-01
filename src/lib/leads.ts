import { randomUUID } from "node:crypto";
import { getDb } from "./db";

export interface LeadRow {
  id: string;
  email: string | null;
  firm_name: string | null;
  site_name: string;
  address: string;
  postcode: string;
  responsible_person: string;
  source: string;
  created_at: string;
}

export function createLead(input: {
  email?: string | null;
  firmName?: string | null;
  siteName: string;
  address?: string;
  postcode?: string;
  responsiblePerson?: string;
}): LeadRow {
  const lead: LeadRow = {
    id: randomUUID(),
    email: input.email?.trim().toLowerCase() || null,
    firm_name: input.firmName?.trim() || null,
    site_name: input.siteName.trim(),
    address: input.address?.trim() ?? "",
    postcode: input.postcode?.trim().toUpperCase() ?? "",
    responsible_person: input.responsiblePerson?.trim() ?? "",
    source: "free-logbook",
    created_at: new Date().toISOString(),
  };

  getDb()
    .prepare(
      `INSERT INTO leads (id, email, firm_name, site_name, address, postcode, responsible_person, source, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      lead.id,
      lead.email,
      lead.firm_name,
      lead.site_name,
      lead.address,
      lead.postcode,
      lead.responsible_person,
      lead.source,
      lead.created_at,
    );

  return lead;
}

export function getLead(id: string): LeadRow | null {
  const row = getDb()
    .prepare("SELECT * FROM leads WHERE id = ?")
    .get(id) as LeadRow | undefined;
  return row ?? null;
}
