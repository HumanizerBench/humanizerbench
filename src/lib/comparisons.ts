import { listCycles, loadCycle } from "./data";

/**
 * Canonical pair slug — always alphabetical so a vs b and b vs a produce the
 * same URL. This is what makes /vs/* pages stable across cycles.
 */
export function comparisonSlug(pair: [string, string]): string {
  const [a, b] = [...pair].sort();
  return `${a}-vs-${b}`;
}

export function parseComparisonSlug(
  slug: string,
): [string, string] | null {
  const marker = "-vs-";
  const idx = slug.indexOf(marker);
  if (idx <= 0) return null;
  const a = slug.slice(0, idx);
  const b = slug.slice(idx + marker.length);
  if (!a || !b) return null;
  return [a, b];
}

export interface VsPair {
  a: string;
  b: string;
  /** Most recent cycle where BOTH humanizers were tested together. */
  cycleId: string;
  /** True if `cycleId` is also the current (latest) cycle. */
  isCurrent: boolean;
}

/**
 * Returns every pair that has ever coexisted in any cycle. Pages generated
 * from this list never orphan: once a vs page exists at a URL, it persists
 * even if one of the humanizers drops out of future cycles. The page just
 * shows data from the most recent cycle where both were present.
 *
 * Pairs that have never coexisted are not generated — there's no shared
 * data to compare.
 */
export async function listAllVsPairs(): Promise<VsPair[]> {
  const cycleIds = await listCycles(); // newest-first
  const currentCycleId = cycleIds[0] ?? null;
  const pairs = new Map<string, VsPair>();
  for (const cycleId of cycleIds) {
    const cycle = await loadCycle(cycleId);
    const slugs = cycle.humanizers.map((h) => h.slug);
    for (let i = 0; i < slugs.length; i++) {
      for (let j = i + 1; j < slugs.length; j++) {
        const slug = comparisonSlug([slugs[i]!, slugs[j]!]);
        if (!pairs.has(slug)) {
          const [a, b] = [slugs[i]!, slugs[j]!].sort();
          pairs.set(slug, {
            a,
            b,
            cycleId,
            isCurrent: cycleId === currentCycleId,
          });
        }
      }
    }
  }
  return Array.from(pairs.values());
}
