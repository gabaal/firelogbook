import Link from "next/link";
import { requireActiveFirm } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import * as schema from "@/lib/schema";
import { ArrowLeft, Shield, User, Building, Users } from "@/components/icons";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { user, firm, membership } = await requireActiveFirm();

  return (
    <div className="shell section">
      <Link href="/dashboard" className="row small muted" style={{ marginBottom: 14, gap: 5 }}>
        <ArrowLeft size={15} /> Back to dashboard
      </Link>

      <h1 className="h-page">Settings</h1>

      <div className="stack-lg" style={{ gap: 24 }}>
        {/* User Profile Section */}
        <section>
          <div className="row-between" style={{ marginBottom: 12 }}>
            <h2 className="h-sec" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <User size={18} /> Account Profile
            </h2>
          </div>
          <div className="card card-pad">
            <form action={async (formData) => {
              "use server";
              const name = formData.get("name") as string;
              await db.update(schema.users)
                .set({ name })
                .where(eq(schema.users.id, user.id));
              revalidatePath("/settings");
            }} className="stack-sm">
              <label className="field">
                <span className="label">Full Name</span>
                <div className="row" style={{ gap: 8 }}>
                  <input
                    name="name"
                    defaultValue={user.name}
                    className="input"
                    style={{ flex: 1 }}
                  />
                  <button className="btn btn-sm btn-primary" type="submit">Save</button>
                </div>
              </label>
              <p className="tiny muted" style={{ marginTop: 8 }}>
                {membership?.role === "owner"
                  ? "You are the firm administrator."
                  : `Your email (${user.email}) is managed by your firm administrator.`}
              </p>
            </form>
          </div>
        </section>

        {/* Firm Settings Section */}
        <section>
          <div className="row-between" style={{ marginBottom: 12 }}>
            <h2 className="h-sec" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Building size={18} /> Firm Settings
            </h2>
          </div>
          <div className="card card-pad">
            <form action={async (formData) => {
              "use server";
              const name = formData.get("firmName") as string;
              const reminderDay = parseInt(formData.get("reminderDay") as string);
              const reminderHour = Math.min(
                10,
                Math.max(0, parseInt(formData.get("reminderHour") as string) || 0),
              );

              await db.update(schema.firms)
                .set({ name, reminder_day: reminderDay, reminder_hour: reminderHour })
                .where(eq(schema.firms.id, firm.id));
              revalidatePath("/settings");
            }} className="stack-lg" style={{ gap: 16 }}>
              <label className="field">
                <span className="label">Firm Name</span>
                <input
                  name="firmName"
                  defaultValue={firm.name}
                  className="input"
                />
              </label>

              <div className="row" style={{ gap: 16 }}>
                <label className="field" style={{ flex: 1 }}>
                  <span className="label">Reminder Day</span>
                  <select name="reminderDay" defaultValue={firm.reminder_day} className="input">
                    <option value="1">Monday</option>
                    <option value="2">Tuesday</option>
                    <option value="3">Wednesday</option>
                    <option value="4">Thursday</option>
                    <option value="5">Friday</option>
                    <option value="6">Saturday</option>
                    <option value="7">Sunday</option>
                  </select>
                </label>
                <label className="field" style={{ flex: 1 }}>
                  <span className="label">Reminder Hour (UK, 0–10)</span>
                  <input
                    name="reminderHour"
                    type="number"
                    min="0"
                    max="10"
                    defaultValue={firm.reminder_hour}
                    className="input"
                  />
                </label>
              </div>

              <button className="btn btn-primary" type="submit">
                Save Firm Settings
              </button>
            </form>
          </div>
        </section>

        {/* Security/Subscription Section */}
        <section>
          <div className="row-between" style={{ marginBottom: 12 }}>
            <h2 className="h-sec" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Shield size={18} /> Subscription & Security
            </h2>
          </div>
          <div className="card card-pad">
            <div className="row-between">
              <div>
                <p style={{ fontWeight: 600 }}>Current Plan: {firm.subscription_status}</p>
                <p className="tiny muted">Managed via Stripe Billing</p>
              </div>
              <Link href="/billing" className="btn btn-sm">Manage Billing</Link>
            </div>
          </div>
        </section>

        {/* Team Management Section */}
        {membership?.role === "owner" && (
          <section>
            <div className="row-between" style={{ marginBottom: 12 }}>
              <h2 className="h-sec" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Users size={18} /> Team Management
              </h2>
            </div>
            <div className="card card-pad">
              <Link href="/settings/team" className="btn btn-primary" style={{ width: "100%", textAlign: "center" }}>
                Manage Team Members
              </Link>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
