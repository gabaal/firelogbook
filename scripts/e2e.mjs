/**
 * End-to-end walk of the charging and onboarding flow against a running server.
 *   node scripts/e2e.mjs [baseUrl]
 */
const base = process.argv[2] ?? "http://127.0.0.1:3100";

let cookies = new Map();

function cookieHeader() {
  return [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

function absorb(res) {
  const raw = res.headers.getSetCookie?.() ?? [];
  for (const line of raw) {
    const [pair] = line.split(";");
    const idx = pair.indexOf("=");
    const name = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    if (value === "") cookies.delete(name);
    else cookies.set(name, value);
  }
}

async function call(path, options = {}) {
  const res = await fetch(base + path, {
    redirect: "manual",
    ...options,
    headers: {
      ...(options.headers ?? {}),
      ...(cookies.size ? { cookie: cookieHeader() } : {}),
    },
  });
  absorb(res);
  return res;
}

async function callPdf(path, options = {}) {
  let res = await call(path, options);
  if (res.status === 202) {
    const data = await res.json();
    const pollUrl = data.pollUrl;
    while (true) {
      res = await call(pollUrl, options);
      if (res.status === 200 && res.headers.get("content-type") === "application/pdf") {
        break;
      }
      if (res.status !== 200) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  return res;
}

function check(label, condition, detail = "") {
  console.log(`${condition ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!condition) process.exitCode = 1;
}

const email = `owner+${Date.now()}@harbourdental.test`;

// 1. Public pages
check("home is public", (await call("/")).status === 200);
check("signin is public", (await call("/signin")).status === 200);

// 2. Protected route redirects
const unauth = await call("/sites");
check(
  "sites redirects to signin",
  unauth.status >= 300 && unauth.status < 400 && (unauth.headers.get("location") ?? "").includes("/signin"),
  `${unauth.status} ${unauth.headers.get("location")}`,
);

// 3. Unauthorised API write is refused
const anon = await call("/api/checks", {
  method: "POST",
  body: new FormData(),
});
check("anon check write is 401", anon.status === 401, String(anon.status));

// 4. Magic link
const reqRes = await call("/api/auth/request", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email }),
});
const reqJson = await reqRes.json();
check("magic link issued", reqRes.status === 200 && Boolean(reqJson.link), JSON.stringify(reqJson).slice(0, 80));
if (!reqJson.link) process.exit(1);

// 5. Verify -> session -> onboarding
const verify = await call(new URL(reqJson.link).pathname + new URL(reqJson.link).search);
check(
  "verify lands on onboarding",
  verify.status >= 300 && verify.status < 400 && (verify.headers.get("location") ?? "").includes("/onboarding"),
  `${verify.status} ${verify.headers.get("location")}`,
);
check("session cookie set", cookies.has("flb_session"));

// 6. Onboarding creates the site
const onb = await call("/api/onboarding", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    firmName: "Harbour Dental Group",
    name: "Harbour Lane Dental",
    address: "12 Harbour Lane, Bristol",
    postcode: "BS1 4QA",
    responsiblePerson: "Dr Anya Patel",
  }),
});
const onbJson = await onb.json();
check("onboarding created a site", onb.status === 200 && Boolean(onbJson.siteId), JSON.stringify(onbJson));
const siteId = onbJson.siteId;

// 7. New audit pack renders
const audit = await call(`/sites/${siteId}/audit?new=1`);
const auditHtml = await audit.text();
check("first audit pack renders", audit.status === 200 && auditHtml.includes("Audit pack"));
check("welcome banner present", auditHtml.includes("This is your first audit pack"));

// 8. Billing page shows trial
const billing = await call("/billing");
const billingHtml = await billing.text();
check("billing shows trial", billing.status === 200 && /Trial/.test(billingHtml));

// 9. Simulated checkout activates
const checkout = await call("/api/billing/checkout", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ interval: "month" }),
});
const checkoutJson = await checkout.json();
check("checkout runs in simulator mode", checkout.status === 200 && checkoutJson.mode === "simulated", JSON.stringify(checkoutJson));

const billingAfter = await call("/billing");
const billingAfterHtml = await billingAfter.text();
check("subscription is active", billingAfterHtml.includes(">Active<") || billingAfterHtm.includes("Active</span>"));

// 10. Recording a check
const fd = new FormData();
fd.set("siteId", siteId);
fd.set("itemKey", "exit-doors");
fd.set("result", "pass");
fd.set("note", "Front and rear doors opened freely.");
fd.set("performedBy", "Anya Patel");
fd.set("happenedAt", new Date().toISOString());
const post = await call("/api/checks", { method: "POST", body: fd });
check("check recorded", post.status === 200, String(post.status));

// 11. PDF export
const pdf = await callPdf(`/api/audit/${siteId}/pdf?from=2025-10-21&to=2026-10-21`);
const pdfBuf = Buffer.from(await pdf.arrayBuffer());
check(
  "audit PDF renders",
  pdf.status === 200 && pdf.headers.get("content-type") === "application/pdf" && pdfBuf.subarray(0, 4).toString() === "%PDF",
  `${pdf.status} ${pdfBuf.length} bytes`,
);

// 12. Cross-tenant isolation
const foreign = await call("/sites/site-harbour");
check("other firm's site is 404", foreign.status === 404, String(foreign.status));

const foreignPdf = await callPdf(`/api/audit/site-harbour/pdf?from=2026-01-01&to=2026-10-21`);
check("other firm's PDF is refused", foreignPdf.status === 404, String(foreignPdf.status));

// 13. Share link works without a session
const { createHmac } = await import("node:crypto");
const secret =
  process.env.SESSION_SECRET?.trim() || "fallback-secret-for-dev-only";
const payload = Buffer.from(
  JSON.stringify({ s: siteId, e: Date.now() + 60 * 60 * 1000 }),
).toString("base64url");
const signature = createHmac("sha256", secret).update(payload).digest("base64url");
const shareToken = `${payload}.${signature}`;

const savedCookies = new Map(cookies);
cookies = new Map();
const sharedView = await call(`/sites/${siteId}/audit?k=${encodeURIComponent(shareToken)}`);
check("share link opens without a session", sharedView.status === 200, String(sharedView.status));
const sharedPdf = await callPdf(
  `/api/audit/${siteId}/pdf?from=2026-01-01&to=2026-10-21&k=${encodeURIComponent(shareToken)}`,
);
check("share link can download the PDF", sharedPdf.status === 200, String(sharedPdf.status));

// A forged token must not open anything.
const forged = `${payload}.${"a".repeat(43)}`;
const forgedView = await call(`/sites/${siteId}/audit?k=${encodeURIComponent(forged)}`);
check("forged share token is refused", forgedView.status >= 300 && forgedView.status < 400, String(forgedView.status));

// 14. Demo account
cookies = new Map();
const demo = await call("/api/auth/demo", { method: "POST" });
check("demo login works", demo.status >= 300 && demo.status < 400, String(demo.status));
const demoSites = await call("/sites");
check("demo sees seeded sites", demoSites.status === 200);

// 15. Reminder engine
const remindersPage = await call("/reminders");
check("reminders page renders", remindersPage.status === 200);

const withoutSession = new Map(cookies);
cookies = new Map();
const anonCron = await call("/api/cron/reminders", { method: "POST" });
check("cron rejects anonymous callers", anonCron.status === 401, String(anonCron.status));
cookies = withoutSession;

const dry = await call("/api/cron/reminders?dry=1&force=1", { method: "POST" });
const dryJson = await dry.json();
check(
  "dry run plans without sending",
  dry.status === 200 && dryJson.planned > 0 && dryJson.sent === 0,
  `planned=${dryJson.planned} sent=${dryJson.sent}`,
);
check(
  "escalation reaches a high level",
  Array.isArray(dryJson.items) && dryJson.items.some((i) => i.level >= 2),
  JSON.stringify(dryJson.items?.map((i) => `${i.site}:L${i.level}`)),
);

const run1 = await call("/api/cron/reminders?force=1", { method: "POST" });
const run1Json = await run1.json();
check(
  "reminder pass accounts for every planned site",
  run1Json.sent + run1Json.skipped === run1Json.planned,
  `planned=${run1Json.planned} sent=${run1Json.sent} skipped=${run1Json.skipped}`,
);
if (run1Json.sent === 0) {
  console.log("      (note: this week's reminders were already sent — run against a fresh data/ to see a send)");
}

const run2 = await call("/api/cron/reminders?force=1", { method: "POST" });
const run2Json = await run2.json();
check(
  "second pass never sends twice",
  run2Json.sent === 0,
  `sent=${run2Json.sent} skipped=${run2Json.skipped}`,
);

// 16. Unsubscribe link
const unsubPayload = Buffer.from(JSON.stringify({ s: "site-kingsdown" })).toString("base64url");
const unsubSig = createHmac("sha256", secret).update(unsubPayload).digest("base64url");
const unsubToken = `${unsubPayload}.${unsubSig}`;
const unsub = await call(`/unsubscribe?t=${encodeURIComponent(unsubToken)}`);
const unsubHtml = await unsub.text();
check(
  "unsubscribe link asks before opting out",
  unsub.status === 200 && unsubHtml.includes("Stop reminders for"),
  String(unsub.status),
);

const unsubConfirm = await call("/api/unsubscribe", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ t: unsubToken }).toString(),
});
check(
  "confirming the unsubscribe opts the site out",
  unsubConfirm.status === 303,
  String(unsubConfirm.status),
);

const dryAfter = await call("/api/cron/reminders?dry=1&force=1", { method: "POST" });
const dryAfterJson = await dryAfter.json();
check(
  "opted-out site is dropped from the plan",
  !dryAfterJson.items.some((i) => i.site.includes("Kingsdown")),
  JSON.stringify(dryAfterJson.items?.map((i) => i.site)),
);

// 17. Sign out
const out = await call("/api/auth/signout", { method: "POST" });
check("sign out clears session", out.status >= 300 && out.status < 400 && !cookies.has("flb_session"));

// 18. Free blank log book (public funnel, no account)
const freePage = await call("/free-logbook");
check("free log book page is public", freePage.status === 200);

const freeCreate = await call("/api/free-logbook", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    siteName: "E2E Test Premises",
    address: "1 Test Street",
    postcode: "BS1 1AA",
    responsiblePerson: "Sam Test",
  }),
});
const freeJson = await freeCreate.json();
check(
  "free log book is generated without an account",
  freeCreate.status === 200 && Boolean(freeJson.id),
  JSON.stringify(freeJson).slice(0, 70),
);

const freeDoc = await call(`/free-logbook/${freeJson.id}`);
check("blank log book renders", freeDoc.status === 200, String(freeDoc.status));

const freePdf = await call(`/api/free-logbook/${freeJson.id}/pdf`);
const freeBuf = Buffer.from(await freePdf.arrayBuffer());
check(
  "blank log book PDF renders",
  freePdf.status === 200 && freeBuf.subarray(0, 4).toString() === "%PDF",
  `${freePdf.status} ${freeBuf.length} bytes`,
);

const freeBlank = await call("/api/free-logbook", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ siteName: "" }),
});
check("free log book rejects a blank premises name", freeBlank.status === 422, String(freeBlank.status));

console.log("\nEmail used:", email);
console.log("Site id:", siteId);
