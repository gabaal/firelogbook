import { db } from "./db";
import { eq, asc, desc, or, and, sql } from "drizzle-orm";
import * as schema from "./schema";
export { db as getDb };
export { FREQUENCIES } from "./checklist";
import { CHECKLIST } from "./checklist";

/* ------------------------------ firms ------------------------------ */

export function getFirm(firmId: string): schema.FirmRow | null {
  return db.query.firms.findFirst({
    where: eq(schema.firms.id, firmId),
  }) ?? null;
}

export function demoFirm(): schema.FirmRow | null {
  return db.query.firms.findFirst({
    where: eq(schema.firms.subscription_status, "demo"),
    limit: 1,
  }) ?? null;
}

export function renameFirm(firmId: string, name: string): void {
  db.update(schema.firms)
    .set({ name })
    .where(eq(schema.firms.id, firmId))
    .run();
}

export function updateFirm(firmId: string, patch: Partial<schema.FirmRow>): void {
  if (Object.keys(patch).length === 0) return;
  db.update(schema.firms)
    .set(patch)
    .where(eq(schema.firms.id, firmId))
    .run();
}

/* ------------------------------ checklist ----------------------------- */

export function getChecklistForSite(siteId: string): schema.ChecklistItemRow[] {
  const rows = db.query.checklist_items.findMany({
    where: eq(schema.checklist_items.site_id, siteId),
    orderBy: [asc(schema.checklist_items.created_at)],
  });

  if (rows.length === 0) {
    seedChecklistForSite(siteId);
    return getChecklistForSite(siteId);
  }

  return rows;
}

export function seedChecklistForSite(siteId: string): void {
  for (const item of CHECKLIST) {
    db.insert(schema.checklist_items).values({
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

export function addChecklistItem(siteId: string, input: {
  title: string;
  guidance: string;
  frequency: string;
  ref: string;
}): string {
  const id = crypto.randomUUID();
  const key = `custom-${crypto.randomUUID().slice(0, 8)}`;
  db.insert(schema.checklist_items).values({
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

export function updateChecklistItem(id: string, patch: Partial<schema.ChecklistItemRow>): void {
  if (Object.keys(patch).length === 0) return;
  db.update(schema.checklist_items)
    .set(patch)
    .where(eq(schema.checklist_items.id, id))
    .run();
}

export function deleteChecklistItem(id: string): void {
  db.delete(schema.checklist_items)
    .where(eq(schema.checklist_items.id, id))
    .run();
}

/* ------------------------------ sites ------------------------------ */

export function countSites(firmId: string): number {
  const result = db.select({ count: sql<number>`count(*)` })
    .from(schema.sites)
    .where(eq(schema.sites.firm_id, firmId))
    .get();
  return Number(result?.count ?? 0);
}

export function listSites(firmId: string): schema.SiteRow[] {
  return db.query.sites.findMany({
    where: eq(schema.sites.firm_id, firmId),
    orderBy: [asc(schema.sites.name)],
  });
}

export function getSiteHealths(firmId: string) {
  const sites = listSites(firmId);
  return sites.map(site => ({
    site,
  }));
}

export function getSite(firmId: string, siteId: string): schema.SiteRow | null {
  return db.query.sites.findFirst({
    where: and(
      eq(schema.sites.id, siteId),
      eq(schema.sites.firm_id, firmId)
    ),
  }) ?? null;
}

export function getSiteById(siteId: string): schema.SiteRow | null {
  return db.query.sites.findFirst({
    where: eq(schema.sites.id, siteId),
  }) ?? null;
}

export function setSiteOptOut(siteId: string, optOut: boolean): void {
  db.update(schema.sites)
    .set({ remind_opt_out: optOut ? 1 : 0 })
    .where(eq(schema.sites.id, siteId))
    .run();
}

export function updateSite(
  firmId: string,
  siteId: string,
  patch: Partial<schema.SiteRow>,
): void {
  if (Object.keys(patch).length === 0) return;
  db.update(schema.sites)
    .set(patch)
    .where(and(
      eq(schema.sites.id, siteId),
      eq(schema.sites.firm_id, firmId)
    ))
    .run();
}

export function createSite(input: {
  firmId: string;
  name: string;
  address: string;
  postcode: string;
  responsiblePerson: string;
  responsibleEmail?: string;
}): schema.SiteRow {
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
  db.insert(schema.sites).values(site).run();
  return site;
}

export function insertPdfJob(input: {
  siteId: string;
  params: string;
}): string {
  const id = crypto.randomUUID();
  db.insert(schema.pdf_jobs).values({
    id,
    site_id: input.siteId,
    params: input.params,
    status: "queued",
    created_at: new Date(),
  }).run();
  return id;
}

export function updatePdfJob(id: string, patch: Partial<{
  status: string;
  file_path: string | null;
  completed_at: string | null;
}>): void {
  if (Object.keys(patch).length === 0) return;
  db.update(schema.pdf_jobs)
    .set(patch)
    .where(eq(schema.pdf_jobs.id, id))
    .run();
}

export function getPdfJob(id: string) {
  return db.query.pdf_jobs.findFirst({
    where: eq(schema.pdf_jobs.id, id),
  });
}

export function getNextPdfJob() {
  return db.query.pdf_jobs.findFirst({
    where: eq(schema.pdf_jobs.status, "queued"),
    limit: 1,
  });
}

/* ------------------------------ checks ----------------------------- */

export function checksForSite(siteId: string, limit?: number): schema.CheckRow[] {
  return db.query.checks.findMany({
    where: eq(schema.checks.site_id, siteId),
    orderBy: [desc(schema.checks.performed_at)],
    limit: limit,
  });
}

export function checksBetween(
  siteId: string,
  fromIso: string,
  toIso: string,
): schema.CheckRow[] {
  return db.query.checks.findMany({
    where: and(
      eq(schema.checks.site_id, siteId),
      sql`${schema.checks.performed_at} >= ${fromIso}`,
      sql`${schema.checks.performed_at} <= ${toIso}`,
    ),
    orderBy: [asc(schema.checks.performed_at)],
  });
}

export function latestCheckPerItem(siteId: string): Map<string, schema.CheckRow> {
  const rows = db.query.checks.findMany({
    where: eq(schema.checks.site_id, siteId),
    orderBy: [desc(schema.checks.performed_at)],
  });
  const map = new Map<string, schema.CheckRow>();
  for (const row of rows) {
    if (!map.has(row.item_key)) map.set(row.item_key, row);
  }
  return map;
}

export function insertCheck(input: {
  siteId: string;
  itemKey: string;
  performedAt: string;
  performedBy: string;
  result: "pass" | "fail" | "na";
  note: string | null;
  photo: string | null;
}): string {
  const id = crypto.randomUUID();
  db.insert(schema.checks).values({
    id,
    site_id: input.siteId,
    item_key: input.itemKey,
    performed_at: new Date(input.performedAt),
    performed_by: input.performedBy,
    result: input.result,
    note: input.note,
    photo: input.photo,
    created_at: new Date(),
  }).run();
  return id;
}

/* ------------------------------ actions ---------------------------- */

export function actionsForSite(siteId: string): schema.ActionRow[] {
  return db.query.actions.findMany({
    where: eq(schema.actions.site_id, siteId),
    orderBy: [
      sql`CASE status WHEN 'open' THEN 0 ELSE 1 END`,
      sql`COALESCE(due_date, created_at) ASC`,
    ],
  });
}

export function actionOwner(actionId: string): { siteId: string; firmId: string } | null {
  const res = db.select({
    siteId: schema.actions.site_id,
    firmId: schema.sites.firm_id,
  })
    .from(schema.actions)
    .innerJoin(schema.sites, eq(schema.sites.id, schema.actions.site_id))
    .where(eq(schema.actions.id, actionId))
    .get();
  return res ?? null;
}

export function insertAction(input: {
  siteId: string;
  checkId: string | null;
  title: string;
  detail: string | null;
  dueDate: string | null;
}): string {
  const id = crypto.randomUUID();
  db.insert(schema.actions).values({
    id,
    site_id: input.siteId,
    check_id: input.checkId,
    title: input.title,
    detail: input.detail,
    due_date: input.dueDate ? new Date(input.dueDate) : null,
    status: "open",
    created_at: new Date(),
  }).run();
  return id;
}

export function closeAction(id: string, note: string): boolean {
  const result = db.update(schema.actions)
    .set({
      status: "closed",
      closed_at: new Date(),
      closed_note: note,
    })
    .where(and(
      eq(schema.actions.id, id),
      eq(schema.actions.status, "open")
    ))
    .run();
  return (result as any).rowCount > 0;
}

/* ------------------------------ email ------------------------------ */

export function logEmail(input: {
  firmId: string;
  toAddr: string;
  subject: string;
  body: string;
  status: string;
}): void {
  db.insert(schema.email_log).values({
    id: crypto.randomUUID(),
    firm_id: input.firmId,
    to_addr: input.toAddr,
    subject: input.subject,
    body: input.body,
    status: input.status,
    created_at: new Date(),
  }).run();
}

export function insertInvite(input: {
  firmId: string;
  email: string;
  role: string;
  token: string;
  expiresAt: string;
}): string {
  const id = crypto.randomUUID();
  db.insert(schema.invites).values({
    id,
    firm_id: input.firmId,
    email: input.email,
    role: input.role,
    token: input.token,
    created_at: new Date(),
    expires_at: new Date(input.expiresAt),
  }).run();
  return id;
}

export function getInviteByToken(token: string) {
  return db.query.invites.findFirst({
    where: eq(schema.invites.token, token),
  });
}

export function deleteInvite(id: string): void {
  db.delete(schema.invites)
    .where(eq(schema.invites.id, id))
    .run();
}

export function listMemberships(firmId: string) {
  return db.select({
    m: schema.memberships,
    email: schema.users.email,
    name: schema.users.name,
  })
    .from(schema.memberships)
    .innerJoin(schema.users, eq(schema.users.id, schema.memberships.user_id))
    .where(eq(schema.memberships.firm_id, firmId))
    .orderBy(asc(schema.memberships.role), asc(schema.users.name));
}
