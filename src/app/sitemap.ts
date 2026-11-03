import type { MetadataRoute } from "next";
import { CHECKLIST } from "@/lib/checklist";
import { baseUrl } from "@/lib/mail";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = baseUrl();
  const now = new Date();

  return [
    {
      url: `${base}/`,
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
    ...CHECKLIST.map((item) => ({
      url: `${base}/checks/${item.key}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
