import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

export const BROWSER_CANDIDATES = [
  process.env.BROWSER_PATH,
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter((p): p is string => Boolean(p));

export function findBrowser(): string | null {
  return BROWSER_CANDIDATES.find((p) => existsSync(p)) ?? null;
}

/**
 * Render a URL to PDF with a headless Chromium-family browser.
 * Resolves false when no browser exists or printing fails, so callers can fall
 * back to the browser's own print dialog.
 */
export function printToPdf(
  browser: string,
  url: string,
  outFile: string,
  timeoutMs = 25_000,
): Promise<boolean> {
  const args = [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--no-pdf-header-footer",
    "--run-all-compositor-stages-before-draw",
    "--virtual-time-budget=6000",
    `--print-to-pdf=${outFile}`,
    url,
  ];

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(browser, args, /*turbopackIgnore: true*/ {
        stdio: "ignore",
        windowsHide: true,
      });
    } catch {
      return finish(false);
    }

    const timer = setTimeout(() => {
      child.kill();
      finish(false);
    }, timeoutMs);

    child.on("error", () => {
      clearTimeout(timer);
      finish(false);
    });

    child.on("exit", async () => {
      clearTimeout(timer);
      const exists = await fs
        .access(outFile)
        .then(() => true)
        .catch(() => false);
      finish(exists);
    });
  });
}

/** Filename-safe slug from a site name. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function exportDir(): string {
  return path.join(process.cwd(), "data", "exports");
}
