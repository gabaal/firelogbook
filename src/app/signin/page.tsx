import { Shield } from "@/components/icons";
import SignInForm from "@/components/SignInForm";

export const dynamic = "force-dynamic";

const ERROR_COPY: Record<string, string> = {
  expired: "That sign-in link has expired or has already been used. Ask for a new one.",
  invalid_token: "That sign-in link is invalid.",
  missing_token: "No sign-in token was provided.",
  demo: "The demo account could not be opened just now.",
  nodemo: "The demo account is not available.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const message = error
    ? ERROR_COPY[error] ?? "We could not sign you in. Please try again."
    : null;

  return (
    <div
      className="shell"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "80vh",
      }}
    >
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ marginBottom: 24, textAlign: "center" }}>
          <Shield size={48} style={{ color: "var(--primary)", margin: "0 auto 16px" }} />
          <h1 className="h-page">Sign in</h1>
          <p className="muted">
            We&rsquo;ll email you a link &mdash; there is no password to remember.
          </p>
        </div>

        {message && (
          <p
            className="small"
            style={{
              color: "var(--bad)",
              fontWeight: 550,
              marginBottom: 16,
              textAlign: "center",
            }}
          >
            {message}
          </p>
        )}

        <SignInForm />
      </div>
    </div>
  );
}
