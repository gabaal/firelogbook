import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActiveFirm } from "@/lib/auth";
import { getSite, getChecklistForSite, addChecklistItem, updateChecklistItem, deleteChecklistItem } from "@/lib/data";
import { FREQUENCIES, type Frequency } from "@/lib/checklist";
import { ArrowLeft, Plus, Trash2 } from "@/components/icons";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export default async function ChecklistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: siteId } = await params;
  const { firm } = await requireActiveFirm();
  const site = await getSite(firm.id, siteId);
  if (!site) notFound();

  const items = await getChecklistForSite(siteId);

  return (
    <div className="shell section">
      <Link href={`/sites/${siteId}`} className="row small muted" style={{ marginBottom: 14, gap: 5 }}>
        <ArrowLeft size={15} /> Back to site
      </Link>

      <div className="row-between" style={{ marginBottom: 20 }}>
        <h1 className="h-page">Manage Checklist</h1>
        <AddTaskForm siteId={siteId} />
      </div>

      <div className="card">
        <table className="rows">
          <thead>
            <tr style={{ height: 48 }}>
              <th style={{ width: 300 }}>Task</th>
              <th style={{ width: 150 }}>Frequency</th>
              <th style={{ width: 150 }}>Ref</th>
              <th style={{ width: 120, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} style={{ height: 60 }}>
                <td style={{ fontWeight: 550, fontSize: "1rem" }}>{item.title}</td>
                <td>{FREQUENCIES[item.frequency as Frequency].label}</td>
                <td className="muted">{item.ref}</td>
                <td style={{ textAlign: "right" }}>
                  <div className="row" style={{ gap: 12, justifyContent: "flex-end" }}>
                    <EditTaskForm item={item} siteId={siteId} />
                    <DeleteTaskButton id={item.id} siteId={siteId} />
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr style={{ height: 100 }}>
                <td colSpan={4} className="empty" style={{ textAlign: "center" }}>No tasks defined for this site.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

async function AddTaskForm({ siteId }: { siteId: string }) {
  return (
    <form action={async (formData) => {
      "use server";
      const title = formData.get("title") as string;
      const guidance = formData.get("guidance") as string;
      const frequency = formData.get("frequency") as string;
      const ref = formData.get("ref") as string;

      if (title && frequency) {
        addChecklistItem(siteId, {
          title,
          guidance: guidance || "No specific guidance provided.",
          frequency,
          ref: ref || "N/A"
        });
        revalidatePath(`/sites/${siteId}/checklist`);
      }
    }} className="row" style={{ gap: 8 }}>
      <input
        name="title"
        placeholder="New task title..."
        className="input"
        style={{ width: 200 }}
        required
      />
      <input
        name="guidance"
        placeholder="Guidance (optional)..."
        className="input"
        style={{ width: 200 }}
      />
      <select name="frequency" className="input" style={{ width: 120 }}>
        {Object.entries(FREQUENCIES).map(([key, { label }]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>
      <input
        name="ref"
        placeholder="Reference (optional)..."
        className="input"
        style={{ width: 150 }}
      />
      <button className="btn btn-primary btn-sm" type="submit">
        <Plus size={14} /> Add
      </button>
    </form>
  );
}

async function EditTaskForm({ item, siteId }: { item: any; siteId: string }) {
  return (
    <form action={async (formData) => {
      "use server";
      const title = formData.get("title") as string;
      const guidance = formData.get("guidance") as string;
      const frequency = formData.get("frequency") as string;
      const ref = formData.get("ref") as string;

      updateChecklistItem(item.id, {
        title: title || item.title,
        guidance: guidance || item.guidance,
        frequency: frequency || item.frequency,
        ref: ref || item.ref
      });
      revalidatePath(`/sites/${siteId}/checklist`);
    }} className="row" style={{ gap: 8 }}>
      <input
        name="title"
        defaultValue={item.title}
        className="input"
        style={{ width: 150 }}
      />
      <input
        name="guidance"
        defaultValue={item.guidance}
        className="input"
        style={{ width: 150 }}
      />
      <select name="frequency" defaultValue={item.frequency} className="input" style={{ width: 100 }}>
        {Object.entries(FREQUENCIES).map(([key, { label }]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>
      <input
        name="ref"
        defaultValue={item.ref}
        className="input"
        style={{ width: 100 }}
      />
      <button className="btn btn-sm" type="submit">Save</button>
    </form>
  );
}

async function DeleteTaskButton({ id, siteId }: { id: string; siteId: string }) {
  return (
    <form action={async () => {
      "use server";
      deleteChecklistItem(id);
      revalidatePath(`/sites/${siteId}/checklist`);
    }}>
      <button className="btn btn-sm btn-ember" type="submit">
        <Trash2 size={14} />
      </button>
    </form>
  );
}
