import type { Humanizer } from "./types";

function avgOfPresent(
  breakdown: Record<string, number>,
  keys: readonly string[],
): number | null {
  const present = keys.filter((k) => typeof breakdown[k] === "number");
  if (present.length !== keys.length) return null;
  const sum = present.reduce((acc, k) => acc + (breakdown[k] as number), 0);
  return sum / present.length;
}

function weightedComposite(h: Humanizer, boosted: readonly string[]): number {
  const avg = avgOfPresent(h.category_breakdown, boosted);
  if (avg === null) return h.scores.composite;
  return (h.scores.composite + 2 * avg) / 3;
}

function reRank(list: Humanizer[]): Humanizer[] {
  return list.map((h, i) => ({ ...h, rank: i + 1 }));
}

export function applyUseCaseSort(
  humanizers: Humanizer[],
  useCaseSlug: string,
): Humanizer[] {
  const copy = humanizers.slice();

  switch (useCaseSlug) {
    case "students": {
      const sorted = copy.sort(
        (a, b) =>
          weightedComposite(b, ["academic_essay"]) -
          weightedComposite(a, ["academic_essay"]),
      );
      return reRank(sorted);
    }
    case "essays": {
      const keys = ["academic_essay", "application_essay"] as const;
      const sorted = copy.sort(
        (a, b) => weightedComposite(b, keys) - weightedComposite(a, keys),
      );
      return reRank(sorted);
    }
    case "gptzero": {
      const sorted = copy.sort(
        (a, b) =>
          (b.detector_breakdown.gptzero ?? 0) -
          (a.detector_breakdown.gptzero ?? 0),
      );
      return reRank(sorted);
    }
    case "originality-ai":
    case "turnitin": {
      const sorted = copy.sort(
        (a, b) =>
          (b.detector_breakdown.originality ?? 0) -
          (a.detector_breakdown.originality ?? 0),
      );
      return reRank(sorted);
    }
    case "seo": {
      const keys = ["blog_post", "marketing_copy"] as const;
      const sorted = copy.sort(
        (a, b) => weightedComposite(b, keys) - weightedComposite(a, keys),
      );
      return reRank(sorted);
    }
    case "academic-writing": {
      const keys = ["academic_essay", "lit_review"] as const;
      const sorted = copy.sort(
        (a, b) => weightedComposite(b, keys) - weightedComposite(a, keys),
      );
      return reRank(sorted);
    }
    case "marketing": {
      const keys = ["marketing_copy", "landing_copy", "product_desc"] as const;
      const sorted = copy.sort(
        (a, b) => weightedComposite(b, keys) - weightedComposite(a, keys),
      );
      return reRank(sorted);
    }
    case "essays-no-signup": {
      const filtered = copy.filter((h) => h.pricing.free_tier === true);
      const sorted = filtered.sort(
        (a, b) => b.scores.composite - a.scores.composite,
      );
      return reRank(sorted);
    }
    default: {
      const sorted = copy.sort(
        (a, b) => b.scores.composite - a.scores.composite,
      );
      return reRank(sorted);
    }
  }
}
