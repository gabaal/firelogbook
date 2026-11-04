import { baseUrl } from "./mail";

/**
 * The bare public host printed on PDFs, e.g. `firelogbook.vercel.app`.
 * Uses the same base URL as links and sitemaps, so moving to a custom
 * domain changes the attribution with no code edit.
 */
export function publicHost(): string {
  const base = baseUrl();
  try {
    return new URL(base).host;
  } catch {
    return base.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  }
}
