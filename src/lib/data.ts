import { getDb, type ActionRow, type CheckRow, type FirmRow, type SiteRow, type ChecklistItemRow } from "./db";
export { getDb };
export { FREQUENCIES } from "./checklist";
import { CHECKLIST } from "./checklist";

/* ------------------------------ firms ------------------------------ */

export function getFirm(firmId: string): FirmRow | null {
  const row = getDb().prepare("SELECT * FROM firms WHERE id = ?").get(firmId) as
    | FirmRow
    | undefined;
  return row ?? null;
}

export function demoFirm(): FirmRow | null {
  const row = getDb()
    .prepare("SELECT * FROM firms WHERE subscription_status = 'demo' LIMIT 1")
    .get() as FirmRow | undefined;
  return row ?? null;
}

export function renameFirm(firmId: string, name: string): void {
  getDb().prepare("UPDATE firms SET name = ? WHERE id = ?").run(name, firmId);
}

export function updateFirm(firmId: string, patch: Partial<FirmRow>): void {
  const keys = Object.keys(patch);
  if (keys.length === 0) return;
  const assignments = keys.map((key) => `${key} = ?`).join(", ");
  const values = keys.map((key) => patch[key as keyof FirmRow] as string | null);
  getDb()
    .prepare(`UPDATE firms SET ${assignments} WHERE id = ?`)
    .run(...values, firmId);
}

/* ------------------------------ checklist ----------------------------- */

export function getChecklistForSite(siteId: string): ChecklistItemRow[] {
  const rows = getDb()
    .prepare("SELECT * FROM checklist_items WHERE site_id = ? ORDER BY created_at ASC")
    .all(siteId) as unknown as ChecklistItemRow[];

  if (rows.length === 0) {
    // Fallback to defaults if no custom checklist exists, and seed it
    seedChecklistForSite(siteId);
    return getChecklistForSite(siteId);
  }

  return rows;
}

export function seedChecklistForSite(siteId: string): void {
  const stmt = getDb().prepare(
    `INSERT OR IGNORE INTO checklist_items (id, site_id, key, title, guidance, frequency, ref, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const item of CHECKLIST) {
    stmt.run(
      crypto.randomUUID(),
      siteId,
      item.key,
      item.title,
      item.guidance,
      item.frequency,
      item.ref,
      new Date().toISOString()
    );
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
  getDb()
    .prepare(
      `INSERT INTO checklist_items (id, site_id, key, title, guidance, frequency, ref, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      siteId,
      key,
      input.title,
      input.guidance,
      input.frequency,
      input.ref,
      new Date().toISOString()
    );
  return id;
}

export function updateChecklistItem(id: string, patch: Partial<ChecklistItemRow>): void {
  const keys = Object.keys(patch);
  if (keys.length === 0) return;
  const assignments = keys.map((key) => `${key} = ?`).join(", ");
  const values = keys.map((key) => patch[key as keyof ChecklistItemRow] as string);
  getDb()
    .prepare(`UPDATE checklist_items SET ${assignments} WHERE id = ?`)
    .run(...values, id);
}

export function deleteChecklistItem(id: string): void {
  getDb().prepare("DELETE FROM checklist_items WHERE id = ?").run(id);
}

/* ------------------------------ sites ------------------------------ */

export function countSites(firmId: string): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) AS n FROM sites WHERE firm_id = ?")
    .get(firmId) as { n: number };
  return row.n;
}

export function listSites(firmId: string): SiteRow[] {
  return getDb()
    .prepare("SELECT * FROM sites WHERE firm_id = ? ORDER BY name ASC")
    .all(firmId) as unknown as SiteRow[];
}

export function getSiteHealths(firmId: string) {
  const sites = listSites(firmId);
  return sites.map(site => ({
    site,
    // We only need the high-level health and overdue count for the dashboard
    // The actual summary logic remains in lib/due.ts to avoid duplication
  }));
}

/** Scoped lookup: a site is only returned to the firm that owns it. */
export function getSite(firmId: string, siteId: string): SiteRow | null {
  const row = getDb()
    .prepare("SELECT * FROM sites WHERE id = ? AND firm_id = ?")
    .get(siteId, firmId) as SiteRow | undefined;
  return row ?? null;
}

export function getSiteById(siteId: string): SiteRow | null {
  const row = getDb()
    .prepare("SELECT * FROM sites WHERE id = ?")
    .get(siteId) as SiteRow | undefined;
  return row ?? null;
}

export function setSiteOptOut(siteId: string, optOut: boolean): void {
  getDb()
    .prepare("UPDATE sites SET remind_opt_out = ? WHERE id = ?")
    .run(optOut ? 1 : 0, siteId);
}

export function updateSite(
  firmId: string,
  siteId: string,
  patch: Partial<SiteRow>,
): void {
  const keys = Object.keys(patch);
  if (keys.length === 0) return;
  const assignments = keys.map((key) => `${key} = ?`).join(", ");
  const values = keys.map((key) => patch[key as keyof SiteRow] as string | number);
  getDb()
    .prepare(`UPDATE sites SET ${assignments} WHERE id = ? AND firm_id = ?`)
    .run(...values, siteId, firmId);
}

export function createSite(input: {
  firmId: string;
  name: string;
  address: string;
  postcode: string;
  responsiblePerson: string;
  responsibleEmail?: string;
}): SiteRow {
  const site: SiteRow = {
    id: crypto.randomUUID(),
    firm_id: input.firmId,
    name: input.name,
    address: input.address,
    postcode: input.postcode,
    responsible_person: input.responsiblePerson,
    responsible_email: input.responsibleEmail ?? "",
    remind_opt_out: 0,
    working_days: "1,2,3,4,5",
    created_at: new Date().toISOString(),
  };
  getDb()
    .prepare(
      `INSERT INTO sites (id, firm_id, name, address, postcode, responsible_person, responsible_email, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      site.id,
      site.firm_id,
      site.name,
      site.address,
      site.postcode,
      site.responsible_person,
      site.responsible_email,
      site.created_at,
    );
  return site;
}

export function insertPdfJob(input: {
  siteId: string;
  params: string;
}): string {
  const id = crypto.randomUUID();
  getDb()
    .prepare(
      `INSERT INTO pdf_jobs (id, site_id, params, created_at)
       VALUES (?, ?, ?, ?)`,
    )
    .run(
      id,
      input.siteId,
      input.params,
      new Date().toISOString(),
    );
  return id;
}

export function updatePdfJob(id: string, patch: Partial<{
  status: string;
  file_path: string | null;
  completed_at: string | null;
}>): void {
  const keys = Object.keys(patch);
  if (keys.length === 0) return;
  const assignments = keys.map((key) => `${key} = ?`).join(", ");
  const values = keys.map((key) => patch[key as keyof typeof patch] as string | null);
  getDb()
    .prepare(`UPDATE pdf_jobs SET ${assignments} WHERE id = ?`)
    .run(...values, id);
}

export function getPdfJob(id: string) {
  return getDb().prepare("SELECT * FROM pdf_jobs WHERE id = ?").get(id) as any | undefined;
}

export function getNextPdfJob() {
  return getDb()
    .prepare("SELECT * FROM pdf_jobs WHERE status = 'queued' ORDER BY created_at ASC LIMIT 1")
    .get() as any | undefined;
}

/* ------------------------------ checks ----------------------------- */

export function checksForSite(siteId: string, limit?: number): CheckRow[] {
  const sql = limit
    ? "SELECT * FROM checks WHERE site_id = ? ORDER BY performed_at DESC LIMIT ?"
    : "SELECT * FROM checks WHERE site_id = ? ORDER BY performed_at DESC";
  const stmt = getDb().prepare(sql);
  return (limit ? stmt.all(siteId, limit) : stmt.all(siteId)) as unknown as CheckRow[];
}

export function checksBetween(
  siteId: string,
  fromIso: string,
  toIso: string,
): CheckRow[] {
  return getDb()
    .prepare(
      `SELECT * FROM checks
       WHERE site_id = ? AND performed_at >= ? AND performed_at <= ?
       ORDER BY performed_at ASC`,
    )
    .all(siteId, fromIso, toIso) as unknown as CheckRow[];
}

export function latestCheckPerItem(siteId: string): Map<string, CheckRow> {
  const rows = getDb()
    .prepare(
      `SELECT * FROM checks
       WHERE site_id = ?
       ORDER BY performed_at DESC`,
    )
    .all(siteId) as unknown as CheckRow[];
  const map = new Map<string, CheckRow>();
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
  getDb()
    .prepare(
      `INSERT INTO checks (id, site_id, item_key, performed_at, performed_by, result, note, photo, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.siteId,
      input.itemKey,
      input.performedAt,
      input.performedBy,
      input.result,
      input.note,
      input.photo,
      new Date().toISOString(),
    );
  return id;
}

/* ------------------------------ actions ---------------------------- */

export function actionsForSite(siteId: string): ActionRow[] {
  return getDb()
    .prepare(
      `SELECT * FROM actions WHERE site_id = ?
       ORDER BY CASE status WHEN 'open' THEN 0 ELSE 1 END,
                COALESCE(due_date, created_at) ASC`,
    )
    .all(siteId) as unknown as ActionRow[];
}

export function actionOwner(actionId: string): { siteId: string; firmId: string } | null {
  const row = getDb()
    .prepare(
      `SELECT a.site_id AS siteId, s.firm_id AS firmId
       FROM actions a JOIN sites s ON s.id = a.site_id
       WHERE a.id = ?`,
    )
    .get(actionId) as { siteId: string; firmId: string } | undefined;
  return row ?? null;
}

export function insertAction(input: {
  siteId: string;
  checkId: string | null;
  title: string;
  detail: string | null;
  dueDate: string | null;
}): string {
  const id = crypto.randomUUID();
  getDb()
    .prepare(
      `INSERT INTO actions (id, site_id, check_id, title, detail, due_date, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'open', ?)`,
    )
    .run(
      id,
      input.siteId,
      input.checkId,
      input.title,
      input.detail,
      input.dueDate,
      new Date().toISOString(),
    );
  return id;
}

export function closeAction(id: string, note: string): boolean {
  const result = getDb()
    .prepare(
      `UPDATE actions SET status = 'closed', closed_at = ?, closed_note = ?
       WHERE id = ? AND status = 'open'`,
    )
    .run(new Date().toISOString(), note, id);
  return result.changes > 0;
}

/* ------------------------------ email ------------------------------ */

export function logEmail(input: {
  firmId: string;
  toAddr: string;
  subject: string;
  body: string;
  status: string;
}): void {
  getDb()
    .prepare(
      `INSERT INTO email_log (id, firm_id, to_addr, subject, body, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      crypto.randomUUID(),
      input.firmId,
      input.toAddr,
      input.subject,
      input.body,
      input.status,
      new Date().toISOString(),
    );
}

export function insertInvite(input: {
  firmId: string;
  email: string;
  role: string;
  token: string;
  expiresAt: string;
}): string {
  const id = crypto.randomUUID();
  getDb()
    .prepare(
      `INSERT INTO invites (id, firm_id, email, role, token, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.firmId,
      input.email,
      input.role,
      input.token,
      new Date().toISOString(),
      input.expiresAt,
    );
  return id;
}

export function getInviteByToken(token: string) {
  return getDb()
    .prepare("SELECT * FROM invites WHERE token = ?")
    .get(token) as any | undefined;
}

export function deleteInvite(id: string): void {
  getDb().prepare("DELETE FROM invites WHERE id = ?").run(id);
}

export function listMemberships(firmId: string) {
  return getDb()
    .prepare(
      `SELECT m.*, u.email, u.name
       FROM memberships m
       JOIN users u ON m.user_id = u.id
       WHERE m.firm_id = ?
       ORDER BY m.role ASC, u.name ASC`,
    )
    .all(firmId) as any[];
}
