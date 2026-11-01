import Link from "next/link";
import { notFound } from "next/navigation";
import CheckForm from "@/components/CheckForm";
import { ArrowLeft } from "@/components/icons";
import { requireActiveFirm } from "@/lib/auth";
import { FREQUENCIES, getChecklistForSite } from "@/lib/data";
import { getSite, latestCheckPerItem } from "@/lib/data";
import { fmtDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CheckPage({
  params,
}: {
  params: Promise<{ id: string; key: string }>;
}) {
  const { id, key } = await params;
  const { firm, user } = await requireActiveFirm();
  const site = getSite(firm.id, id);
  if (!site) notFound();

  const checklist = getChecklistForSite(site.id);
  const item = checklist.find((i) => i.key === key);
  if (!item) notFound();

  const last = latestCheckPerItem(site.id).get(item.key) ?? null;
  const lastSummary = last
    ? `Last recorded ${fmtDateTime(last.performed_at)} by ${last.performed_by}${
        last.note ? ` — “${last.note.slice(0, 160)}”` : ""
      }`
    : "This check has not been recorded at this site yet.";

  return (
    <div className="shell section" style={{ maxWidth: 720 }}>
      <Link
        href={`/sites/${site.id}`}
        className="row small muted"
        style={{ marginBottom: 16, gap: 5 }}
      >
        <ArrowLeft size={15} /> {site.name}
      </Link>

      <CheckForm
        siteId={site.id}
        itemKey={item.key}
        title={item.title}
        guidance={item.guidance}
        reference={item.ref}
        frequencyLabel={FREQUENCIES[item.frequency].label}
        lastSummary={lastSummary}
        userName={user.name}
      />
    </div>
  );
}
