import Link from "next/link";
import { redirect } from "next/navigation";
import { createLoginToken } from "@/lib/auth";
import { Shield } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  async function handleSignIn(formData: FormData) {
    "use server";
    const email = formData.get("email") as string;
    if (!email) return;

    const { token } = await createLoginToken(email);
    // In a real app, we'd send an email here.
    // For this build, we'll redirect directly to the API route to handle cookies.
    redirect(`/api/auth/magic?token=${token}`);
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
