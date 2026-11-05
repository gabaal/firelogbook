import type { MetadataRoute } from "next";
import { CHECKLIST } from "@/lib/checklist";
import { baseUrl } from "@/lib/mail";

// Bump this when the public copy changes. Using build time here would tell
// crawlers every URL changed on every deploy, which is not true.
const CONTENT_UPDATED = new Date("2026-11-05");

export default function sitemap(): MetadataRoute.Sitemap {
  const base = baseUrl();
  const now = CONTENT_UPDATED;

  return [
    {
      url: base,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/free-logbook`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${base}/checks`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${base}/help`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${base}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${base}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    ...CHECKLIST.map((item) => ({
      url: `${base}/checks/${item.key}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
