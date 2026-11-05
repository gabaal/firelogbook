/**
 * Shared SEO constants. The generated image lives at app/opengraph-image.tsx;
 * referencing it by path lets each page keep its own openGraph object without
 * losing the image (page-level openGraph replaces the layout's wholesale).
 */
export const SITE_NAME = "FireLogbook";

export const OG_IMAGE_ALT =
  "FireLogbook — the fire safety logbook for small sites, with a dated audit pack";

export const OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: OG_IMAGE_ALT,
};
