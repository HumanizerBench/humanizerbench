import type { Cycle, Humanizer, HumanizerHistory } from "./types";

// Cycle JSON is loaded at build time — never from the filesystem at request
// time — so this module works inside the Cloudflare Workers prerender
// sandbox (which has no fs).
//
// Two environments hit this file:
//   1. The Astro build (Vite): `import.meta.glob` is statically transformed
//      into an object literal containing every matching JSON file inlined.
//      No fs at runtime.
//   2. Build-time scripts run via `tsx` (Node): scripts/generate-og.ts and
//      scripts/generate-redirects.ts pre-generate static assets BEFORE
//      `astro build`. They import this module directly and `import.meta.glob`
//      is undefined there, so we fall back to fs.

// Vite statically rewrites `import.meta.glob(...)` calls at build time into
// an inlined object literal. The match is AST-pattern-based — wrapping the
// call in a TypeScript cast or a ternary hides it from the matcher and the
// transform is skipped, leaving a runtime call to undefined. So the call
// MUST be a direct top-level expression. The @ts-expect-error keeps tsc
// happy when this file is parsed by tsx in Node (where `glob` doesn't
// exist on import.meta) — the try/catch handles the runtime throw there.
let viteCycleModules: Record<string, Cycle> | null = null;
try {
  // @ts-expect-error — Vite-only property, throws TypeError in plain Node.
  viteCycleModules = import.meta.glob(
    "../../data/cycles/*/leaderboard.json",
    { eager: true, import: "default" },
  ) as Record<string, Cycle>;
} catch {
  // Plain Node (e.g. tsx scripts/generate-og.ts) — use fs fallback below.
}

/**
 * Build an in-memory map of cycle_id → Cycle. Populated once at module load
 * in Vite; lazily in Node (the scripts use it briefly, then exit).
 */
let CYCLES_PROMISE: Promise<Map<string, Cycle>> | null = null;

function getCycles(): Promise<Map<string, Cycle>> {
  if (CYCLES_PROMISE) return CYCLES_PROMISE;
  CYCLES_PROMISE = (async () => {
    const map = new Map<string, Cycle>();
    if (viteCycleModules) {
      // Path looks like: ../../data/cycles/2026-05/leaderboard.json
      for (const [filePath, cycle] of Object.entries(viteCycleModules)) {
        const match = filePath.match(/\/cycles\/([^/]+)\/leaderboard\.json$/);
        if (!match) continue;
        map.set(match[1]!, cycle);
      }
      return map;
    }
    // Node fallback for tsx-run scripts.
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const dataRoot = path.resolve(process.cwd(), "data");
    const cyclesDir = path.join(dataRoot, "cycles");
    const entries = await fs.readdir(cyclesDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const file = path.join(cyclesDir, entry.name, "leaderboard.json");
      // In-flight cycles publish commit.json at creation but only get a
      // leaderboard.json once they're scored and marked complete. Treat
      // those as not-yet-listable rather than crashing the build.
      let raw: string;
      try {
        raw = await fs.readFile(file, "utf8");
      } catch (err: unknown) {
        if (
          err &&
          typeof err === "object" &&
          "code" in err &&
          (err as { code: string }).code === "ENOENT"
        ) {
          continue;
        }
        throw err;
      }
      map.set(entry.name, JSON.parse(raw) as Cycle);
    }
    return map;
  })();
  return CYCLES_PROMISE;
}

export async function loadCycle(cycle: string): Promise<Cycle> {
  const cycles = await getCycles();
  const found = cycles.get(cycle);
  if (!found) throw new Error(`Cycle not found: ${cycle}`);
  return found;
}

export async function listCycles(): Promise<string[]> {
  const cycles = await getCycles();
  return Array.from(cycles.keys()).sort((a, b) =>
    a < b ? 1 : a > b ? -1 : 0,
  );
}

export async function loadLatestCycle(): Promise<Cycle> {
  const cycles = await listCycles();
  if (cycles.length === 0) {
    throw new Error("No cycles found in /data/cycles/");
  }
  return loadCycle(cycles[0]!);
}

export async function loadHumanizerHistory(
  slug: string,
): Promise<HumanizerHistory | null> {
  const cycleIds = await listCycles();
  // listCycles() returns newest-first; iterate oldest-first so points are chronological.
  const sortedAsc = [...cycleIds].reverse();
  const points: HumanizerHistory["points"] = [];
  for (const cycleId of sortedAsc) {
    const cycle = await loadCycle(cycleId);
    const h = cycle.humanizers.find((x) => x.slug === slug);
    if (!h) continue;
    points.push({
      cycle: cycle.cycle,
      composite: h.scores.composite,
      bypass_rate: h.scores.bypass_rate,
      detector_breakdown: h.detector_breakdown,
      category_breakdown: h.category_breakdown,
    });
  }
  if (points.length === 0) return null;
  return { slug, points };
}

export async function listHumanizers(): Promise<Humanizer[]> {
  const cycle = await loadLatestCycle();
  return cycle.humanizers;
}

export interface HumanizerWithMeta {
  slug: string;
  /** Humanizer record from the most recent cycle where this slug was tested. */
  humanizer: Humanizer;
  /** The cycle id that record came from. */
  latestCycle: string;
  /** True if `latestCycle` is also the current (latest overall) cycle. */
  isCurrent: boolean;
}

/**
 * Returns every humanizer that has ever appeared in any cycle, paired with
 * its most-recent appearance. Used by /humanizers/[slug] so that pages don't
 * orphan when a humanizer drops out of the current cycle — once a page has
 * existed at a URL it persists forever, just rendering historical data with
 * a "not in current cycle" banner.
 */
export async function listAllHumanizersAcrossCycles(): Promise<HumanizerWithMeta[]> {
  const cycleIds = await listCycles(); // newest-first
  const currentCycleId = cycleIds[0] ?? null;
  const seen = new Map<string, HumanizerWithMeta>();
  for (const cycleId of cycleIds) {
    const cycle = await loadCycle(cycleId);
    for (const h of cycle.humanizers) {
      if (!seen.has(h.slug)) {
        seen.set(h.slug, {
          slug: h.slug,
          humanizer: h,
          latestCycle: cycleId,
          isCurrent: cycleId === currentCycleId,
        });
      }
    }
  }
  return Array.from(seen.values());
}

export async function listDetectorSlugs(): Promise<string[]> {
  const humanizers = await listHumanizers();
  const first = humanizers[0];
  if (!first) return [];
  return Object.keys(first.detector_breakdown);
}
