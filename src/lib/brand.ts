// Served from /public so it works on every host (Netlify, Lovable, local).
export const brandLogo = "/brand-logo.jpg";

function siteOrigin() {
  if (typeof window !== "undefined") return window.location.origin;
  return "https://pmcexchange.netlify.app";
}

// Social previews need an absolute URL.
export const brandPreviewMeta = [
  { property: "og:image", content: `https://pmcexchange.netlify.app${brandLogo}` },
  { name: "twitter:image", content: `https://pmcexchange.netlify.app${brandLogo}` },
  { property: "og:image:alt", content: "PrimeCapital orange and silver financial logo" },
];

export { siteOrigin };
