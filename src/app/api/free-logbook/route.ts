import { NextResponse, type NextRequest } from "next/server";
import { createLead } from "@/lib/leads";
import { baseUrl, mailMode, sendMail } from "@/lib/mail";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const limited = await rateLimit(`lead:${ip}`, 5, 60 * 60_000);
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "That is a lot of logbooks. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSeconds) },
      },
    );
  }

  try {
    const parsed = await req.json().catch(() => null);
    const body = (
      parsed && typeof parsed === "object" ? parsed : {}
    ) as Record<string, unknown>;
    const siteName = String(body.siteName ?? "").trim().slice(0, 120);
    const email = String(body.email ?? "").trim().slice(0, 160);
    const firmName = String(body.firmName ?? "").trim().slice(0, 120);
    const address = String(body.address ?? "").trim().slice(0, 200);
    const postcode = String(body.postcode ?? "").trim().slice(0, 16);
    const responsiblePerson = String(body.responsiblePerson ?? "").trim().slice(0, 80);

    if (siteName.length < 2) {
      return NextResponse.json({ error: "Give the premises a name" }, { status: 422 });
    }
    if (email && !EMAIL.test(email)) {
      return NextResponse.json({ error: "That email does not look right" }, { status: 422 });
    }

    const lead = await createLead({
      email,
      firmName,
      siteName,
      address,
      postcode,
      responsiblePerson,
    });

    const link = `${baseUrl()}/free-logbook/${lead.id}`;

    // Best effort: never fail the download because mail failed.
    if (email) {
      try {
        await sendMail({
          to: email,
          subject: `Your fire safety log book — ${siteName}`,
          text: [
            "Here is the log book you generated.",
            "",
            link,
            "",
            "It is yours to print and use. No account needed.",
          ].join("\n"),
        });
      } catch {
        /* ignore */
      }
    }

    return NextResponse.json({
      ok: true,
      id: lead.id,
      link,
      // Surfaced only when no mail provider is configured.
      mailMode: mailMode(),
      emailed: Boolean(email),
    });
  } catch (error) {
    // Without this the function returns an empty 500 body, and the browser
    // reports "Unexpected end of JSON input" instead of showing the failure.
    console.error("free-logbook: could not create the log book", error);
    return NextResponse.json(
      {
        error:
          "We could not build your log book just now. Please try again in a minute.",
      },
      { status: 500 },
    );
  }
}
