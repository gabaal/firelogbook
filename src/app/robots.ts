import type { MetadataRoute } from "next";
import { baseUrl } from "@/lib/mail";

export default function robots(): MetadataRoute.Robots {
  const base = baseUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/signin",
          "/onboarding",
          "/dashboard",
          "/sites",
          "/settings",
          "/billing",
          "/reminders",
          "/outbox",
          "/analytics",
          "/unsubscribe",
          "/lead-unsubscribe",
          // The printable log book itself is per-lead; the form is public.
          "/free-logbook/",
          "/auth/",
          "/api/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
