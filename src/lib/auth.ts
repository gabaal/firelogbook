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
import { eq, and } from "drizzle-orm";
import * as schema from "./schema";

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
  const db = getDb();
  const session: SessionRow = {
    id: randomUUID(),
    user_id: userId,
    firm_id: firmId,
    expires_at: new Date(Date.now() + SESSION_DAYS * 86_400_000),
    created_at: new Date(),
  };
  await db.insert(schema.sessions).values(session);
  return `${session.id}.${signPayload(session.id)}`;
}

export function clearSessionCookieValue(): string {
  return "";
}

export async function endSession(cookieValue: string | undefined): Promise<void> {
  if (!cookieValue) return;
  const [id] = cookieValue.split(".");
  if (id) {
    const db = getDb();
    await db.delete(schema.sessions).where(eq(schema.sessions.id, id));
  }
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
  const session = await db.query.sessions.findFirst({
    where: eq(schema.sessions.id, id),
  });
  if (!session) return null;
  if (session.expires_at.getTime() < Date.now()) {
    await db.delete(schema.sessions).where(eq(schema.sessions.id, id));
    return null;
  }

  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, session.user_id),
  });
  const firm = await db.query.firms.findFirst({
    where: eq(schema.firms.id, session.firm_id),
  });
  const membership = await db.query.memberships.findFirst({
    where: and(
      eq(schema.memberships.user_id, session.user_id),
      eq(schema.memberships.firm_id, session.firm_id)
    ),
  });

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

export async function createLoginToken(email: string): Promise<{ token: string; expires: Date }> {
  const db = getDb();
  const token = randomBytes(24).toString("base64url");
  const expires = new Date(Date.now() + 20 * 60_000);
  await db.insert(schema.login_tokens).values({
    token,
    email: email.toLowerCase().trim(),
    expires_at: expires,
    created_at: new Date(),
  });
  return { token, expires };
}

export async function consumeLoginToken(token: string): Promise<string | null> {
  const db = getDb();
  const row = await db.query.login_tokens.findFirst({
    where: eq(schema.login_tokens.token, token),
  });

  if (!row || row.used_at) return null;
  if (row.expires_at.getTime() < Date.now()) return null;

  await db.update(schema.login_tokens)
    .set({ used_at: new Date() })
    .where(eq(schema.login_tokens.token, token));

  return row.email;
}

function firmNameFromEmail(email: string): string {
  const domain = email.split("@")[1] ?? "";
  if (!domain) return "My account";
  const base = domain.split(".")[0] ?? domain;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

/** Find or create the user, their firm and the membership. */
export async function ensureAccount(email: string): Promise<{
  user: UserRow;
  firm: FirmRow;
  role: MembershipRow["role"];
  created: boolean;
}> {
  const db = getDb();
  const normalised = email.toLowerCase().trim();
  const existing = await db.query.users.findFirst({
    where: eq(schema.users.email, normalised),
  });

  if (existing) {
    const membership = await db.query.memberships.findFirst({
      where: eq(schema.memberships.user_id, existing.id),
    });
    const firm = membership
      ? await db.query.firms.findFirst({
          where: eq(schema.firms.id, membership.firm_id),
        })
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
    created_at: now,
  };
  const firm: FirmRow = {
    id: randomUUID(),
    name: firmNameFromEmail(normalised),
    created_at: now,
    subscription_status: "trialing",
    plan_interval: null,
    trial_ends_at: new Date(now.getTime() + 14 * 86_400_000),
    stripe_customer_id: null,
    stripe_subscription_id: null,
    current_period_end: null,
    reminders_enabled: 1,
    reminder_day: 1,
    reminder_hour: 7,
  };

  await db.insert(schema.users).values(user);
  await db.insert(schema.firms).values(firm);
  await db.insert(schema.memberships).values({
    id: randomUUID(),
    user_id: user.id,
    firm_id: firm.id,
    role: "owner",
    created_at: now,
  });

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
