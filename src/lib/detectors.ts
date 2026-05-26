export interface DetectorInfo {
  name: string;
  url: string;
  blurb: string;
}

export const DETECTORS = {
  gptzero: {
    name: "GPTZero",
    url: "https://gptzero.me",
    blurb:
      "One of the earliest AI-text detectors, widely used by educators to flag machine-generated student work.",
  },
  originality: {
    name: "Originality.ai",
    url: "https://originality.ai",
    blurb:
      "A subscription detector marketed at publishers and SEO teams, often cited as a proxy for Turnitin's classifier.",
  },
  copyleaks: {
    name: "Copyleaks",
    url: "https://copyleaks.com",
    blurb:
      "An enterprise plagiarism and AI-detection platform serving universities and content-moderation teams.",
  },
  winston: {
    name: "Winston AI",
    url: "https://gowinston.ai",
    blurb:
      "A consumer-friendly AI detector that also offers readability and plagiarism scores in the same workflow.",
  },
  sapling: {
    name: "Sapling",
    url: "https://sapling.ai",
    blurb:
      "A grammar-and-writing-assistant company whose AI detector is bundled into a broader productivity suite.",
  },
  zerogpt: {
    name: "ZeroGPT",
    url: "https://zerogpt.com",
    blurb:
      "A free, browser-based detector popular for quick spot checks of suspected AI content.",
  },
} as const satisfies Record<string, DetectorInfo>;

export type DetectorSlug = keyof typeof DETECTORS;
