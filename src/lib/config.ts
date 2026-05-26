export const BRAND_NAME = "HumanizerBench";

// Resolved from Vite's `import.meta.env` when running under Astro, or from
// `process.env` when running under tsx/node (e.g. build-time scripts).
function resolveSiteUrl(): string {
  const fromVite =
    typeof import.meta !== "undefined" &&
    // `env` is only defined under Vite/Astro
    (import.meta as unknown as { env?: Record<string, string | undefined> })
      .env?.SITE_URL;
  const fromProcess =
    typeof process !== "undefined" ? process.env?.SITE_URL : undefined;
  return fromVite ?? fromProcess ?? "https://humanizerbench.example.com";
}

export const SITE_URL: string = resolveSiteUrl();

export const GITHUB_REPO_URL =
  "https://github.com/HumanizerBench/humanizerbench";

export const PARENT_ORG = "WriteHuman";
export const PARENT_ORG_URL = "https://writehuman.ai";

export interface BestForUseCase {
  slug: string;
  label: string;
  targetQuery: string;
  displayedSortLogic: string;
}

export const BEST_FOR_USE_CASES: BestForUseCase[] = [
  {
    slug: "students",
    label: "Best AI Humanizer for Students",
    targetQuery: "best ai humanizer for students",
    displayedSortLogic:
      "Weights academic_essay category 2x vs. the main overall score",
  },
  {
    slug: "essays",
    label: "Best AI Humanizer for Essays",
    targetQuery: "best ai humanizer for essays",
    displayedSortLogic:
      "Weights academic_essay + application_essay categories 2x vs. the main overall score",
  },
  {
    slug: "gptzero",
    label: "Best AI Humanizer for GPTZero",
    targetQuery: "best ai humanizer for gptzero",
    displayedSortLogic: "Sorted by GPTZero detector score only",
  },
  {
    slug: "originality-ai",
    label: "Best AI Humanizer for Originality.ai",
    targetQuery: "best ai humanizer for originality.ai",
    displayedSortLogic: "Sorted by Originality.ai detector score only",
  },
  {
    slug: "turnitin",
    label: "Best AI Humanizer for Turnitin",
    targetQuery: "best ai humanizer for turnitin",
    displayedSortLogic:
      "Sorted by Originality.ai detector score (Turnitin proxy)",
  },
  {
    slug: "seo",
    label: "Best AI Humanizer for SEO",
    targetQuery: "best ai humanizer for seo",
    displayedSortLogic:
      "Weights blog_post + marketing_copy categories 2x vs. the main overall score",
  },
  {
    slug: "academic-writing",
    label: "Best AI Humanizer for Academic Writing",
    targetQuery: "best ai humanizer for academic writing",
    displayedSortLogic:
      "Weights academic_essay + lit_review categories 2x vs. the main overall score",
  },
  {
    slug: "marketing",
    label: "Best AI Humanizer for Marketing",
    targetQuery: "best ai humanizer for marketing",
    displayedSortLogic:
      "Weights marketing_copy + landing_copy + product_desc categories 2x vs. the main overall score",
  },
  {
    slug: "essays-no-signup",
    label: "Free AI Humanizer for Essays",
    targetQuery: "free ai humanizer for essays no signup",
    displayedSortLogic:
      "Filtered to free-tier humanizers, sorted by overall score",
  },
];
