import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  createSession,
  ensureAccount,
} from "@/lib/auth";
import { countSites } from "@/lib/data";
import { Shield } from "@/components/icons";

export const dynamic = "force-dynamic";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  async function handleSignIn(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    if (!EMAIL.test(email)) redirect("/signin?error=invalid_email");

    let destination = "/onboarding";
    try {
      const { user, firm } = await ensureAccount(email);
      const session = await createSession(user.id, firm.id);
      const store = await cookies();
      store.set(SESSION_COOKIE, session, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 86_400,
        secure: process.env.NODE_ENV === "production",
      });
      destination = (await countSites(firm.id)) > 0 ? "/sites" : "/onboarding";
    } catch (err) {
      console.error("signin: could not create the session", err);
      redirect("/signin?error=signin_failed");
    }

    redirect(destination);
  }

  return (
    <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
      <div className="card card-pad" style={{ maxWidth: 400, textAlign: "center" }}>
        <div style={{ marginBottom: 24 }}>
          <Shield size={48} style={{ color: "var(--primary)", margin: "0 auto 16px" }} />
          <h1 className="h-page">Sign in</h1>
          <p className="muted">Enter your email to access your logbook</p>
        </div>

        {error && (
          <p className="small" style={{ color: "var(--bad)", fontWeight: 550, marginBottom: 16, textAlign: "center" }}>
            {error === "invalid_token" ? "The login link is invalid or has expired." :
             error === "missing_token" ? "No login token was provided." :
             error === "invalid_email" ? "That does not look like an email address." :
             error === "signin_failed" ? "We could not sign you in just now. Please try again." :
             error}
          </p>
        )}

        <form action={handleSignIn} className="stack-lg">
          <label className="field">
            <span className="label">Email address</span>
            <input
              name="email"
              type="email"
              className="input"
              placeholder="name@company.co.uk"
              required
              autoFocus
            />
          </label>
          <button className="btn btn-primary btn-block" type="submit">
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
