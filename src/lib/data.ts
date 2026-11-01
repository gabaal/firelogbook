import { db } from "./db";
import { eq, asc, desc, or, and, sql } from "drizzle-orm";
import * as schema from "./schema";
export { db as getDb };
export { FREQUENCIES } from "./checklist";
import { CHECKLIST } from "./checklist";

/* ------------------------------ firms ------------------------------ */

export async function getFirm(firmId: string): Promise<schema.FirmRow | null> {
  return await db.query.firms.findFirst({
    where: eq(schema.firms.id, firmId),
  }) ?? null;
}

export async function demoFirm(): Promise<schema.FirmRow | null> {
  return await db.query.firms.findFirst({
    where: eq(schema.firms.subscription_status, "demo"),
    limit: 1,
  }) ?? null;
}

export async function renameFirm(firmId: string, name: string): Promise<void> {
  await db.update(schema.firms)
    .set({ name })
    .where(eq(schema.firms.id, firmId));
}

export async function updateFirm(firmId: string, patch: Partial<schema.FirmRow>): Promise<void> {
  if (Object.keys(patch).length === 0) return;
  await db.update(schema.firms)
    .set(patch)
    .where(eq(schema.firms.id, firmId));
}

/* ------------------------------ checklist ----------------------------- */

export async function getChecklistForSite(siteId: string): Promise<schema.ChecklistItemRow[]> {
  const rows = await db.query.checklist_items.findMany({
    where: eq(schema.checklist_items.site_id, siteId),
    orderBy: [asc(schema.checklist_items.created_at)],
  });

  if (rows.length === 0) {
    await seedChecklistForSite(siteId);
    return getChecklistForSite(siteId);
  }

  return rows;
}

export async function seedChecklistForSite(siteId: string): Promise<void> {
  for (const item of CHECKLIST) {
    await db.insert(schema.checklist_items).values({
      id: crypto.randomUUID(),
      site_id: siteId,
      key: item.key,
      title: item.title,
      guidance: item.guidance,
      frequency: item.frequency,
      ref: item.ref,
      created_at: new Date(),
    }).onConflictDoNothing();
  }
}

export async function addChecklistItem(siteId: string, input: {
  title: string;
  guidance: string;
  frequency: string;
  ref: string;
}): Promise<string> {
  const id = crypto.randomUUID();
  const key = `custom-${crypto.randomUUID().slice(0, 8)}`;
  await db.insert(schema.checklist_items).values({
    id,
    site_id: siteId,
    key,
    title: input.title,
    guidance: input.guidance,
    frequency: input.frequency,
    ref: input.ref,
    created_at: new Date(),
  });
  return id;
}

export async function updateChecklistItem(id: string, patch: Partial<schema.ChecklistItemRow>): Promise<void> {
  if (Object.keys(patch).length === 0) return;
  await db.update(schema.checklist_items)
    .set(patch)
    .where(eq(schema.checklist_items.id, id));
}

export async function deleteChecklistItem(id: string): Promise<void> {
  await db.delete(schema.checklist_items)
    .where(eq(schema.checklist_items.id, id));
}

/* ------------------------------ sites ------------------------------ */

export async function countSites(firmId: string): Promise<number> {
  const result = await db.select({ count: sql`count(*)` })
    .from(schema.sites)
    .where(eq(schema.sites.firm_id, firmId));

  const rows = result as any;
  const count = rows[0]?.count;
  return typeof count === 'number' ? count : Number(count ?? 0);
}

export async function listSites(firmId: string): Promise<schema.SiteRow[]> {
  return await db.query.sites.findMany({
    where: eq(schema.sites.firm_id, firmId),
    orderBy: [asc(schema.sites.name)],
  });
}

export async function getSiteHealths(firmId: string) {
  const sites = await listSites(firmId);
  return sites.map(site => ({
    site,
  }));
}

export async function getSite(firmId: string, siteId: string): Promise<schema.SiteRow | null> {
  return await db.query.sites.findFirst({
    where: and(
      eq(schema.sites.id, siteId),
      eq(schema.sites.firm_id, firmId)
    ),
  }) ?? null;
}

export async function getSiteById(siteId: string): Promise<schema.SiteRow | null> {
  return await db.query.sites.findFirst({
    where: eq(schema.sites.id, siteId),
  }) ?? null;
}

export async function setSiteOptOut(siteId: string, optOut: boolean): Promise<void> {
  await db.update(schema.sites)
    .set({ remind_opt_out: optOut ? 1 : 0 })
    .where(eq(schema.sites.id, siteId));
}

export async function updateSite(
  firmId: string,
  siteId: string,
  patch: Partial<schema.SiteRow>,
): Promise<void> {
  if (Object.keys(patch).length === 0) return;
  await db.update(schema.sites)
    .set(patch)
    .where(and(
      eq(schema.sites.id, siteId),
      eq(schema.sites.firm_id, firmId)
    ));
}

export async function createSite(input: {
  firmId: string;
  name: string;
  address: string;
  postcode: string;
  responsiblePerson: string;
  responsibleEmail?: string;
}): Promise<schema.SiteRow> {
  const site = {
    id: crypto.randomUUID(),
    firm_id: input.firmId,
    name: input.name,
    address: input.address,
    postcode: input.postcode,
    responsible_person: input.responsiblePerson,
    responsible_email: input.responsibleEmail ?? "",
    remind_opt_out: 0,
    working_days: "1,2,3,4,5",
    created_at: new Date(),
  };
  await db.insert(schema.sites).values(site);
  return site;
}

export async function insertPdfJob(input: {
  siteId: string;
  params: string;
}): Promise<string> {
  const id = crypto.randomUUID();
  await db.insert(schema.pdf_jobs).values({
    id,
    site_id: input.siteId,
    params: input.params,
    status: "queued",
    created_at: new Date(),
  });
  return id;
}

export async function updatePdfJob(id: string, patch: Partial<{
  status: string;
  file_path: string | null;
  completed_at: Date | null;
}>): Promise<void> {
  if (Object.keys(patch).length === 0) return;
  await db.update(schema.pdf_jobs)
    .set(patch)
    .where(eq(schema.pdf_jobs.id, id));
}

export async function getPdfJob(id: string) {
  return await db.query.pdf_jobs.findFirst({
    where: eq(schema.pdf_jobs.id, id),
  });
}

export async function getNextPdfJob() {
  return await db.query.pdf_jobs.findFirst({
    where: eq(schema.pdf_jobs.status, "queued"),
    limit: 1,
  });
}

/* ------------------------------ checks ----------------------------- */

export async function checksForSite(siteId: string, limit?: number): Promise<schema.CheckRow[]> {
  return await db.query.checks.findMany({
    where: eq(schema.checks.site_id, siteId),
    orderBy: [desc(schema.checks.performed_at)],
    limit: limit,
  });
}

export async function checksBetween(
  siteId: string,
  fromIso: string,
  toIso: string,
): Promise<schema.CheckRow[]> {
  return await db.query.checks.findMany({
    where: and(
      eq(schema.checks.site_id, siteId),
      sql`${schema.checks.performed_at} >= ${fromIso}`,
      sql`${schema.checks.performed_at} <= ${toIso}`,
    ),
    orderBy: [asc(schema.checks.performed_at)],
  });
}

export async function latestCheckPerItem(siteId: string): Promise<Map<string, schema.CheckRow>> {
  const rows = await db.query.checks.findMany({
    where: eq(schema.checks.site_id, siteId),
    orderBy: [desc(schema.checks.performed_at)],
  });
  const map = new Map<string, schema.CheckRow>();
  for (const row of rows) {
    if (!map.has(row.item_key)) map.set(row.item_key, row);
  }
  return map;
}

export async function insertCheck(input: {
  siteId: string;
  itemKey: string;
  performedAt: string;
  performedBy: string;
  result: "pass" | "fail" | "na";
  note: string | null;
  photo: string | null;
}): Promise<string> {
  const id = crypto.randomUUID();
  await db.insert(schema.checks).values({
    id,
    site_id: input.siteId,
    item_key: input.itemKey,
    performed_at: new Date(input.performedAt),
    performed_by: input.performedBy,
    result: input.result,
    note: input.note,
    photo: input.photo,
    created_at: new Date(),
  });
  return id;
}

/* ------------------------------ actions ---------------------------- */

export async function actionsForSite(siteId: string): Promise<schema.ActionRow[]> {
  return await db.query.actions.findMany({
    where: eq(schema.actions.site_id, siteId),
    orderBy: [
      sql`CASE status WHEN 'open' THEN 0 ELSE 1 END`,
      sql`COALESCE(due_date, created_at) ASC`,
    ],
  });
}

export async function actionOwner(actionId: string): Promise<{ siteId: string; firmId: string } | null> {
  const result = await db.select({
    siteId: schema.actions.site_id,
    firmId: schema.sites.firm_id,
  })
    .from(schema.actions)
    .innerJoin(schema.sites, eq(schema.sites.id, schema.actions.site_id))
    .where(eq(schema.actions.id, actionId));

  const rows = result as any;
  return rows[0] ?? null;
}

export async function insertAction(input: {
  siteId: string;
  checkId: string | null;
  title: string;
  detail: string | null;
  dueDate: string | null;
}): Promise<string> {
  const id = crypto.randomUUID();
  await db.insert(schema.actions).values({
    id,
    site_id: input.siteId,
    check_id: input.checkId,
    title: input.title,
    detail: input.detail,
    due_date: input.dueDate ? new Date(input.dueDate) : null,
    status: "open",
    created_at: new Date(),
  });
  return id;
}

export async function closeAction(id: string, note: string): Promise<boolean> {
  const result = await db.update(schema.actions)
    .set({
      status: "closed",
      closed_at: new Date(),
      closed_note: note,
    })
    .where(and(
      eq(schema.actions.id, id),
      eq(schema.actions.status, "open")
    ));
  return (result as any).rowCount > 0;
}

/* ------------------------------ email ------------------------------ */

export async function logEmail(input: {
  firmId: string;
  toAddr: string;
  subject: string;
  body: string;
  status: string;
}): Promise<void> {
  await db.insert(schema.email_log).values({
    id: crypto.randomUUID(),
    firm_id: input.firmId,
    to_addr: input.toAddr,
    subject: input.subject,
    body: input.body,
    status: input.status,
    created_at: new Date(),
  });
}

export async function insertInvite(input: {
  firmId: string;
  email: string;
  role: string;
  token: string;
  expiresAt: string;
}): Promise<string> {
  const id = crypto.randomUUID();
  await db.insert(schema.invites).values({
    id,
    firm_id: input.firmId,
    email: input.email,
    role: input.role,
    token: input.token,
    created_at: new Date(),
    expires_at: new Date(input.expiresAt),
  });
  return id;
}

export async function getInviteByToken(token: string) {
  return await db.query.invites.findFirst({
    where: eq(schema.invites.token, token),
  });
}

export async function deleteInvite(id: string): Promise<void> {
  await db.delete(schema.invites)
    .where(eq(schema.invites.id, id));
}

export async function listMemberships(firmId: string) {
  return await db.select({
    m: schema.memberships,
    email: schema.users.email,
    name: schema.users.name,
  })
    .from(schema.memberships)
    .innerJoin(schema.users, eq(schema.users.id, schema.memberships.user_id))
    .where(eq(schema.memberships.firm_id, firmId))
    .orderBy(asc(schema.memberships.role), asc(schema.users.name));
}
