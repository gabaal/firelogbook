import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActiveFirm } from "@/lib/auth";
import { createSite } from "@/lib/data";
import { ArrowLeft, Plus } from "@/components/icons";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export default async function NewSitePage() {
  const { firm } = await requireActiveFirm();

  return (
    <div className="shell section" style={{ maxWidth: 600 }}>
      <Link href="/dashboard" className="row small muted" style={{ marginBottom: 14, gap: 5 }}>
        <ArrowLeft size={15} /> Back to dashboard
      </Link>

      <div className="row-between" style={{ marginBottom: 24 }}>
        <h1 className="h-page">Add New Site</h1>
        <div className="pill pill-neutral" style={{ fontSize: 12 }}>
          {firm.name}
        </div>
      </div>

      <div className="card card-pad">
        <form action={async (formData) => {
          "use server";
          const name = formData.get("name") as string;
          const address = formData.get("address") as string;
          const postcode = formData.get("postcode") as string;
          const responsiblePerson = formData.get("responsiblePerson") as string;
          const responsibleEmail = formData.get("responsibleEmail") as string;

          if (!name || !responsiblePerson) {
            // In a real app, we'd handle errors more gracefully
            return;
          }

          const site = await createSite({
            firmId: firm.id,
            name,
            address,
            postcode,
            responsiblePerson,
            responsibleEmail,
          });

          revalidatePath("/dashboard");
          revalidatePath("/sites");
          redirect(`/sites/${site.id}`);
        }} className="stack-lg">
          <div className="field">
            <span className="label">Site Name</span>
            <input
              name="name"
              className="input"
              placeholder="e.g. Main Warehouse"
              required
              autoFocus
            />
          </div>

          <div className="row" style={{ gap: 16 }}>
            <div className="field" style={{ flex: 3 }}>
              <span className="label">Address</span>
              <input
                name="address"
                className="input"
                placeholder="123 Industrial Way"
              />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <span className="label">Postcode</span>
              <input
                name="postcode"
                className="input"
                placeholder="SW1A 1AA"
              />
            </div>
          </div>

          <div className="card card-pad" style={{ background: "var(--ink-1)", border: "1px solid var(--line)" }}>
            <p className="eyebrow" style={{ color: "var(--ink-2)" }}>Responsible Person</p>
            <p className="tiny muted" style={{ marginBottom: 12 }}>
              This person will be the primary contact for reminders and audit evidence.
            </p>
            <div className="stack-sm" style={{ gap: 12 }}>
              <label className="field">
                <span className="label">Full Name</span>
                <input
                  name="responsiblePerson"
                  className="input"
                  placeholder="John Doe"
                  required
                />
              </label>
              <label className="field">
                <span className="label">Email Address</span>
                <input
                  name="responsibleEmail"
                  type="email"
                  className="input"
                  placeholder="john@example.com"
                />
              </label>
            </div>
          </div>

          <div className="row" style={{ gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
            <Link href="/dashboard" className="btn btn-sm btn-ghost">
              Cancel
            </Link>
            <button className="btn btn-primary btn-sm" type="submit">
              <Plus size={14} /> Create Site
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
