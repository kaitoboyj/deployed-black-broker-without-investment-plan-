import logo from "@/assets/primecapital-logo.jpg.asset.json";

export const brandLogo = logo.url;
// Stable public asset path, shared by page-specific social previews.
export const brandPreviewMeta = [
  {
    property: "og:image",
    content: `https://id-preview--1837dff1-1cd3-4b45-8db0-6bb76f75aae5.lovable.app${logo.url}`,
  },
  {
    name: "twitter:image",
    content: `https://id-preview--1837dff1-1cd3-4b45-8db0-6bb76f75aae5.lovable.app${logo.url}`,
  },
  { property: "og:image:alt", content: "PrimeCapital orange and silver financial logo" },
];
