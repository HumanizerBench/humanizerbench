/**
 * Formats a composite score. The runner emits composite on a 0–100 scale
 * (e.g. 92.33), but the original seed used 0–1 (e.g. 0.912). This helper
 * tolerates both so the renderer doesn't have to guess.
 */
export function fmtComposite(v: number | null | undefined): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "—";
  const pct = v > 1.5 ? v : v * 100;
  return pct.toFixed(1);
}

/**
 * Returns the composite as a 0–100 number (not a string), with the same
 * tolerance as fmtComposite. Useful where downstream callers compute on it
 * (e.g. score bars, sparkline normalization).
 */
export function compositePct(v: number | null | undefined): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return 0;
  return v > 1.5 ? v : v * 100;
}
