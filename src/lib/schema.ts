import {
  BRAND_NAME,
  SITE_URL,
  PARENT_ORG,
  PARENT_ORG_URL,
  GITHUB_REPO_URL,
} from "./config";
import type { Cycle, Humanizer } from "./types";

/**
 * Sitewide Organization schema. Injected on every page via Base.astro.
 * Includes the parent organization (WriteHuman) for transparency.
 */
export function organizationSchema(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    parentOrganization: {
      "@type": "Organization",
      name: PARENT_ORG,
      url: PARENT_ORG_URL,
    },
    sameAs: [GITHUB_REPO_URL],
  };
}

/**
 * Dataset schema for /leaderboard and /leaderboard/[cycle]. Points to the
 * /api/leaderboard.json distribution and records the cycle metadata.
 */
export function datasetSchema(cycle: Cycle): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `AI Humanizer Benchmark — Cycle ${cycle.cycle}`,
    description: `Monthly independent benchmark of ${cycle.humanizers.length} AI humanizers across multiple commercial detectors. All inputs, outputs, and scores published.`,
    creator: {
      "@type": "Organization",
      name: BRAND_NAME,
      url: SITE_URL,
    },
    url: `${SITE_URL}/leaderboard/${cycle.cycle}`,
    distribution: [
      {
        "@type": "DataDownload",
        encodingFormat: "application/json",
        contentUrl: `${SITE_URL}/api/leaderboard.json`,
      },
    ],
    license: "https://creativecommons.org/licenses/by/4.0/",
    version: cycle.methodology_version,
    dateModified: cycle.generated_at,
    temporalCoverage: cycle.cycle,
    keywords: [
      "AI humanizer",
      "benchmark",
      "AI detector",
      "GPTZero",
      "Originality.ai",
    ],
  };
}

/**
 * SoftwareApplication schema for a humanizer detail page.
 * Intentionally does NOT include aggregateRating or Review — by editorial policy.
 */
export function softwareApplicationSchema(
  humanizer: Humanizer,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: humanizer.name,
    url: humanizer.url,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: humanizer.pricing.monthly_usd,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      category: "subscription",
    },
  };
}

/**
 * ItemList schema for the leaderboard and best-for pages.
 * Each item is a SoftwareApplication wrapped in a ListItem.
 */
export function itemListSchema(
  humanizers: Humanizer[],
  pageUrl: string,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    url: pageUrl,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    numberOfItems: humanizers.length,
    itemListElement: humanizers.map((h, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      item: softwareApplicationSchema(h),
    })),
  };
}

/**
 * BreadcrumbList schema for any sub-page.
 */
export function breadcrumbListSchema(
  items: Array<{ name: string; url: string }>,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export interface ArticleSchemaInput {
  title: string;
  description: string;
  pubDate: Date | string;
  author: string;
  url?: string;
}

/**
 * BlogPosting schema for an individual blog post.
 */
export function articleSchema(
  post: ArticleSchemaInput,
): Record<string, unknown> {
  const datePublished =
    typeof post.pubDate === "string"
      ? post.pubDate
      : post.pubDate.toISOString();
  const out: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished,
    author: {
      "@type": "Person",
      name: post.author,
    },
    publisher: {
      "@type": "Organization",
      name: BRAND_NAME,
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/logo.png`,
      },
    },
  };
  if (post.url) {
    out.mainEntityOfPage = {
      "@type": "WebPage",
      "@id": post.url,
    };
  }
  return out;
}

/**
 * FAQPage schema for pages with a Q&A block. Google may surface these
 * in rich results when the visible Q&A matches the schema content
 * (which it must — the question/answer text on the page should mirror
 * the schema strings exactly).
 */
export function faqPageSchema(
  items: Array<{ question: string; answer: string }>,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
