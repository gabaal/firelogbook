/**
 * Layout probe: opens a page in headless Edge at a given viewport, reports which
 * elements overflow horizontally, and optionally saves a screenshot.
 *
 *   node scripts/probe.mjs <url> <width> <height> [screenshot.png]
 */
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";

const [url, widthArg, heightArg, shotPath, cookieArg, scrollArg] = process.argv.slice(2);
const width = Number(widthArg ?? 420);
const height = Number(heightArg ?? 1000);
const scrollY = Number(scrollArg ?? 0);

const EDGE = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].find((p) => existsSync(p));

const profile = path.join(os.tmpdir(), `probe-${randomUUID()}`);
const port = 9300 + Math.floor(Math.random() * 400);

const child = spawn(
  EDGE,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    `--user-data-dir=${profile}`,
    `--remote-debugging-port=${port}`,
    "about:blank",
  ],
  { stdio: "ignore", windowsHide: true },
);

async function targets() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/list`);
      const list = await r.json();
      const page = list.find((t) => t.type === "page");
      if (page) return page;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("DevTools did not start");
}

const page = await targets();
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));

let id = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
};

function send(method, params = {}) {
  const myId = ++id;
  ws.send(JSON.stringify({ id: myId, method, params }));
  return new Promise((resolve) => pending.set(myId, resolve));
}

await send("Page.enable");
await send("Runtime.enable");
await send("Network.enable");

if (cookieArg) {
  const idx = cookieArg.indexOf("=");
  const name = cookieArg.slice(0, idx);
  const value = cookieArg.slice(idx + 1);
  await send("Network.setCookie", {
    name,
    value,
    domain: "127.0.0.1",
    path: "/",
    httpOnly: true,
  });
}

await send("Emulation.setDeviceMetricsOverride", {
  width,
  height,
  deviceScaleFactor: 1,
  mobile: width < 600,
});
await send("Page.navigate", { url });
await new Promise((r) => setTimeout(r, 2500));

if (scrollY > 0) {
  await send("Runtime.evaluate", { expression: `window.scrollTo(0, ${scrollY})` });
  await new Promise((r) => setTimeout(r, 500));
}

const probe = `(() => {
  const de = document.documentElement;
  const wide = [];
  for (const el of document.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (r.right > de.clientWidth + 0.5) {
      wide.push({
        tag: el.tagName.toLowerCase(),
        cls: String(el.className || '').slice(0, 50),
        right: Math.round(r.right),
        w: Math.round(r.width)
      });
    }
  }
  return JSON.stringify({ scrollWidth: de.scrollWidth, clientWidth: de.clientWidth, bodyScroll: document.body.scrollWidth, wide: wide.slice(0, 12) }, null, 1);
})()`;

const res = await send("Runtime.evaluate", {
  expression: probe,
  returnByValue: true,
});
console.log(res.result?.result?.value ?? JSON.stringify(res));

if (shotPath) {
  const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await fs.writeFile(shotPath, Buffer.from(shot.result.data, "base64"));
  console.log("saved", shotPath);
}

ws.close();
child.kill();
process.exit(0);
