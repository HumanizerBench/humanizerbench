import fs from "node:fs/promises";
import path from "node:path";
import type { Cycle, Humanizer, HumanizerHistory } from "./types";

// Resolve from the working directory so this works regardless of where Vite
// places the bundled chunk during `astro build`.
const DATA_ROOT = path.resolve(process.cwd(), "data");

export async function loadCycle(cycle: string): Promise<Cycle> {
  const filePath = path.join(DATA_ROOT, "cycles", cycle, "leaderboard.json");
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as Cycle;
}

export async function listCycles(): Promise<string[]> {
  const cyclesDir = path.join(DATA_ROOT, "cycles");
  const entries = await fs.readdir(cyclesDir, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
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
