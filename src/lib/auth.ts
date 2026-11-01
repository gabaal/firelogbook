import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes, randomUUID } from "node:crypto";
import {
  getDb,
  type FirmRow,
  type MembershipRow,
  type SessionRow,
  type UserRow,
} from "./db";
import { firmIsActive } from "./billing";
import { signPayload, signToken, verifyPayload, verifyToken } from "./tokens";

export const SESSION_COOKIE = "flb_session";
const SESSION_DAYS = 30;

export interface AuthContext {
  user: UserRow;
  firm: FirmRow;
  membership: MembershipRow;
  session: SessionRow;
}

/* ------------------------------------------------------------------ */
/* Sessions                                                            */
/* ------------------------------------------------------------------ */

export async function createSession(userId: string, firmId: string): Promise<string> {
  const session: SessionRow = {
    id: randomUUID(),
    user_id: userId,
    firm_id: firmId,
    expires_at: new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString(),
    created_at: new Date().toISOString(),
  };
  getDb()
    .prepare(
      `INSERT INTO sessions (id, user_id, firm_id, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(
      session.id,
      session.user_id,
      session.firm_id,
      session.expires_at,
      session.created_at,
    );
  return `${session.id}.${signPayload(session.id)}`;
}

export function clearSessionCookieValue(): string {
  return "";
}

export function endSession(cookieValue: string | undefined): void {
  if (!cookieValue) return;
  const [id] = cookieValue.split(".");
  if (id) getDb().prepare("DELETE FROM sessions WHERE id = ?").run(id);
}

function readSessionCookie(value: string | undefined): string | null {
  if (!value) return null;
  const [id, signature] = value.split(".");
  if (!id || !signature) return null;
  if (!verifyPayload(id, signature)) return null;
  return id;
}

export async function getSession(): Promise<AuthContext | null> {
  const store = await cookies();
  const id = readSessionCookie(store.get(SESSION_COOKIE)?.value);
  if (!id) return null;

  const db = getDb();
  const session = db
    .prepare("SELECT * FROM sessions WHERE id = ?")
    .get(id) as SessionRow | undefined;
  if (!session) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) {
    db.prepare("DELETE FROM sessions WHERE id = ?").run(id);
    return null;
  }

  const user = db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(session.user_id) as UserRow | undefined;
  const firm = db
    .prepare("SELECT * FROM firms WHERE id = ?")
    .get(session.firm_id) as FirmRow | undefined;
  const membership = db
    .prepare("SELECT * FROM memberships WHERE user_id = ? AND firm_id = ?")
    .get(session.user_id, session.firm_id) as MembershipRow | undefined;

  if (!user || !firm || !membership) return null;
  return { user, firm, membership, session };
}

/** For server components: sends the visitor to sign in if there is no session. */
export async function requireFirm(): Promise<AuthContext> {
  const session = await getSession();
  if (!session) redirect("/signin");
  return session;
}

/** Auth plus a live subscription or an unexpired trial. */
export async function requireActiveFirm(): Promise<AuthContext> {
  const session = await requireFirm();
  if (!firmIsActive(session.firm)) redirect("/billing?paywall=1");
  return session;
}

/* ------------------------------------------------------------------ */
/* Magic links                                                         */
/* ------------------------------------------------------------------ */

export function createLoginToken(email: string): { token: string; expires: Date } {
  const token = randomBytes(24).toString("base64url");
  const expires = new Date(Date.now() + 20 * 60_000);
  getDb()
    .prepare(
      `INSERT INTO login_tokens (token, email, expires_at, created_at)
       VALUES (?, ?, ?, ?)`,
    )
    .run(token, email.toLowerCase().trim(), expires.toISOString(), new Date().toISOString());
  return { token, expires };
}

export function consumeLoginToken(token: string): string | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM login_tokens WHERE token = ?")
    .get(token) as
    | { token: string; email: string; expires_at: string; used_at: string | null }
    | undefined;

  if (!row || row.used_at) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;

  db.prepare("UPDATE login_tokens SET used_at = ? WHERE token = ?").run(
    new Date().toISOString(),
    token,
  );
  return row.email;
}

function firmNameFromEmail(email: string): string {
  const domain = email.split("@")[1] ?? "";
  if (!domain) return "My account";
  const base = domain.split(".")[0] ?? domain;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

/** Find or create the user, their firm and the membership. */
export function ensureAccount(email: string): {
  user: UserRow;
  firm: FirmRow;
  role: MembershipRow["role"];
  created: boolean;
} {
  const db = getDb();
  const normalised = email.toLowerCase().trim();
  const existing = db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(normalised) as UserRow | undefined;

  if (existing) {
    const membership = db
      .prepare("SELECT * FROM memberships WHERE user_id = ? ORDER BY created_at LIMIT 1")
      .get(existing.id) as MembershipRow | undefined;
    const firm = membership
      ? (db
          .prepare("SELECT * FROM firms WHERE id = ?")
          .get(membership.firm_id) as FirmRow | undefined)
      : undefined;
    if (membership && firm) {
      return { user: existing, firm, role: membership.role, created: false };
    }
    throw new Error("User exists without a firm");
  }

  const now = new Date();
  const user: UserRow = {
    id: randomUUID(),
    email: normalised,
    name: "",
    created_at: now.toISOString(),
  };
  const firm: FirmRow = {
    id: randomUUID(),
    name: firmNameFromEmail(normalised),
    created_at: now.toISOString(),
    subscription_status: "trialing",
    plan_interval: null,
    trial_ends_at: new Date(now.getTime() + 14 * 86_400_000).toISOString(),
    stripe_customer_id: null,
    stripe_subscription_id: null,
    current_period_end: null,
    reminders_enabled: 1,
    reminder_day: 1,
    reminder_hour: 7,
  };

  db.prepare(
    "INSERT INTO users (id, email, name, created_at) VALUES (?, ?, ?, ?)",
  ).run(user.id, user.email, user.name, user.created_at);
  db.prepare(
    `INSERT INTO firms (id, name, created_at, subscription_status, trial_ends_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(firm.id, firm.name, firm.created_at, firm.subscription_status, firm.trial_ends_at);
  db.prepare(
    "INSERT INTO memberships (id, user_id, firm_id, role, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(randomUUID(), user.id, firm.id, "owner", user.created_at);

  return { user, firm, role: "owner", created: true };
}

/* ------------------------------------------------------------------ */
/* Share tokens (audit pack links, page rendering for PDF export)       */
/* ------------------------------------------------------------------ */

export function signShareToken(siteId: string, ttlMs = 7 * 86_400_000): string {
  return signToken({ s: siteId, e: Date.now() + ttlMs });
}

export function verifyShareToken(token: string, siteId: string): boolean {
  const data = verifyToken<{ s: string; e: number }>(token);
  if (!data) return false;
  return data.s === siteId && data.e > Date.now();
}

export async function requireRole(role: "owner" | "admin" | "member", session: AuthContext) {
  const roles = {
    owner: 3,
    admin: 2,
    member: 1,
  };
  if (roles[session.membership.role] < roles[role]) {
    redirect("/dashboard");
  }
}
