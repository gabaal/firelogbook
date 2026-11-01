/**
 * Prints a session cookie value for screenshots.
 *   node scripts/mkcookie.mjs demo
 *   node scripts/mkcookie.mjs new <email>
 */
const base = "http://127.0.0.1:3100";
const mode = process.argv[2] ?? "demo";

function cookieFrom(res) {
  const raw = res.headers.getSetCookie?.() ?? [];
  for (const line of raw) {
    const [pair] = line.split(";");
    if (pair.startsWith("flb_session=")) return pair;
  }
  return "";
}

if (mode === "demo") {
  const res = await fetch(`${base}/api/auth/demo`, { method: "POST", redirect: "manual" });
  console.log(cookieFrom(res));
} else {
  const email = process.argv[3] ?? `shot+${Date.now()}@example.test`;
  const req = await fetch(`${base}/api/auth/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const { link } = await req.json();
  const res = await fetch(link, { redirect: "manual" });
  console.log(cookieFrom(res));
}
