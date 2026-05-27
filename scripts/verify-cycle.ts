/**
 * Independently verify a cycle's commit-reveal transparency bundle AND
 * full-reproducibility bundle.
 *
 * For each cycle directory under `data/cycles/`:
 *
 *   Transparency checks (require commit.json, nonce.txt, prompts.json,
 *   templates.json, banks.json, select-placeholders.js):
 *     1. sha256(nonce) === commit.json.committed_hash
 *     2. Re-derive placeholders from (nonce, templates, banks) using the
 *        frozen algorithm.
 *     3. Re-substitute placeholders, assert resulting prompts match
 *        prompts.json exactly.
 *
 *   Reproducibility checks (require cycle.json, samples.json, tests.json,
 *   detector-scores.json, scoring.js):
 *     4. cycle.json SHA-256 manifest matches each sibling file.
 *     5. Run scoring.js against samples + tests + detector-scores.
 *        Assert per-humanizer composite, sub-scores, breakdowns, and
 *        penalty counts match leaderboard.json within 1e-4.
 *
 * Cycles missing transparency artifacts are skipped with a warning. Cycles
 * with transparency but missing reproducibility are checked for
 * transparency only (cycles that pre-date the reproducibility work).
 *
 * Exit code is 0 on full success, 1 on any verification failure.
 *
 * Usage:
 *   tsx scripts/verify-cycle.ts <cycle>     # verify one cycle
 *   tsx scripts/verify-cycle.ts --all       # verify every cycle directory
 */

import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_ROOT = path.resolve(__dirname, "../data");
const CYCLES_DIR = path.join(DATA_ROOT, "cycles");
const EPSILON = 1e-9;

/**
 * Mirror of `round()` in admin's src/lib/export/buildExport.ts. Admin
 * rounds composite + score_delta to 2 places, and everything else
 * (bypass_rate, meaning_preservation, readability, consistency,
 * detector_breakdown, category_breakdown, score_intervals) to 4 places
 * before publishing. We apply the same rounding to the replay output so
 * the comparison is apples-to-apples; the remaining `1e-9` epsilon is
 * just float-equality slop after rounding.
 */
function round(n: number, places: number): number {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}

interface CommitJson {
  cycle: string;
  committed_hash: string;
  prompt_set_version: string;
  started_at: string;
}

interface TemplateRow {
  slug: string;
  category: string;
  prompt_text: string;
}

interface ResolvedPrompt {
  slug: string;
  category: string;
  template: string;
  resolved: string;
  placeholders: Record<string, string>;
}

interface SelectModule {
  selectPlaceholdersForCycle: (
    nonce: string,
    prompts: TemplateRow[],
    banks: Record<string, readonly string[]>,
  ) => Record<string, Record<string, string>>;
  substitutePlaceholders: (
    text: string,
    values: Record<string, string>,
  ) => { text: string; missing: string[] };
}

interface CycleManifest {
  cycle: string;
  counts: Record<string, number>;
  files: Record<string, string>;
}

interface ScoringModule {
  computeLeaderboard: (inputs: {
    samples: unknown[];
    tests: unknown[];
    detectorScores: unknown[];
  }) => {
    humanizers: Array<{
      slug: string;
      composite: number;
      composite_raw: number;
      bypass_rate: number;
      meaning_preservation: number;
      readability: number;
      consistency_across_categories: number;
      detector_breakdown: Record<string, number>;
      category_breakdown: Record<string, number>;
      penalties_applied: Array<{ code: string; count: number; score_delta: number }>;
      successful_test_count: number;
      flagged_test_count: number;
      sample_count: number;
      confidence: string;
    }>;
  };
}

interface PublishedLeaderboard {
  cycle: string;
  humanizers: Array<{
    slug: string;
    scores: {
      composite: number;
      bypass_rate: number;
      meaning_preservation: number;
      readability: number;
      consistency_across_categories: number;
    };
    detector_breakdown: Record<string, number>;
    category_breakdown: Record<string, number>;
    penalties_applied: Array<{ code: string; count: number; score_delta: number }>;
    successful_test_count: number;
    flagged_test_count: number;
  }>;
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function readJson<T>(p: string): Promise<T> {
  const raw = await fs.readFile(p, "utf8");
  return JSON.parse(raw) as T;
}

function close(a: number, b: number): boolean {
  return Math.abs(a - b) <= EPSILON;
}

function diffNumeric(label: string, expected: number, actual: number, errors: string[]): void {
  if (!close(expected, actual)) {
    errors.push(
      `${label} mismatch — expected ${expected.toFixed(6)}, got ${actual.toFixed(6)}`,
    );
  }
}

async function verifyTransparency(
  cycleName: string,
  dir: string,
): Promise<{ errors: string[]; promptsCount: number; skipped: boolean }> {
  const errors: string[] = [];

  const paths = {
    commit: path.join(dir, "commit.json"),
    nonce: path.join(dir, "nonce.txt"),
    prompts: path.join(dir, "prompts.json"),
    templates: path.join(dir, "templates.json"),
    banks: path.join(dir, "banks.json"),
    algo: path.join(dir, "select-placeholders.js"),
  };

  const presence = {
    commit: await fileExists(paths.commit),
    nonce: await fileExists(paths.nonce),
    prompts: await fileExists(paths.prompts),
    templates: await fileExists(paths.templates),
    banks: await fileExists(paths.banks),
    algo: await fileExists(paths.algo),
  };
  const anyPresent = Object.values(presence).some(Boolean);
  if (!anyPresent) return { errors, promptsCount: 0, skipped: true };

  const missing = Object.entries(presence)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length > 0) {
    errors.push(`${cycleName}: partial transparency bundle, missing: ${missing.join(", ")}`);
    return { errors, promptsCount: 0, skipped: false };
  }

  const commit = await readJson<CommitJson>(paths.commit);
  const nonce = (await fs.readFile(paths.nonce, "utf8")).trim();
  const templates = await readJson<TemplateRow[]>(paths.templates);
  const banks = await readJson<Record<string, readonly string[]>>(paths.banks);
  const expectedPrompts = await readJson<ResolvedPrompt[]>(paths.prompts);

  const actualHash = createHash("sha256").update(nonce).digest("hex");
  if (actualHash !== commit.committed_hash) {
    errors.push(
      `${cycleName}: sha256(nonce) mismatch — expected ${commit.committed_hash}, got ${actualHash}`,
    );
  }
  if (commit.cycle !== cycleName) {
    errors.push(
      `${cycleName}: commit.json.cycle is "${commit.cycle}" but directory is "${cycleName}"`,
    );
  }

  const algoUrl = pathToFileURL(paths.algo).href;
  const algo: SelectModule = await import(algoUrl);
  const placeholders = algo.selectPlaceholdersForCycle(nonce, templates, banks);
  const sortedTemplates = templates
    .slice()
    .sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
  const rederived: ResolvedPrompt[] = sortedTemplates.map((t) => {
    const values = placeholders[t.slug] ?? {};
    const sub = algo.substitutePlaceholders(t.prompt_text, values);
    return {
      slug: t.slug,
      category: t.category,
      template: t.prompt_text,
      resolved: sub.text,
      placeholders: values,
    };
  });

  if (rederived.length !== expectedPrompts.length) {
    errors.push(
      `${cycleName}: prompt count mismatch — re-derived ${rederived.length}, published ${expectedPrompts.length}`,
    );
  }
  const bySlug = new Map(expectedPrompts.map((p) => [p.slug, p]));
  for (const r of rederived) {
    const e = bySlug.get(r.slug);
    if (!e) {
      errors.push(`${cycleName}: re-derived prompt "${r.slug}" not in prompts.json`);
      continue;
    }
    if (e.resolved !== r.resolved) {
      errors.push(
        `${cycleName}: resolved text for "${r.slug}" differs from published\n      expected: ${e.resolved}\n      got:      ${r.resolved}`,
      );
    }
    if (e.template !== r.template) {
      errors.push(`${cycleName}: template for "${r.slug}" differs from published`);
    }
    if (JSON.stringify(e.placeholders) !== JSON.stringify(r.placeholders)) {
      errors.push(`${cycleName}: placeholders for "${r.slug}" differ from published`);
    }
  }

  return { errors, promptsCount: rederived.length, skipped: false };
}

async function verifyReproducibility(
  cycleName: string,
  dir: string,
): Promise<{ errors: string[]; humanizerCount: number; skipped: boolean }> {
  const errors: string[] = [];

  const paths = {
    manifest: path.join(dir, "cycle.json"),
    samples: path.join(dir, "samples.json"),
    tests: path.join(dir, "tests.json"),
    detectorScores: path.join(dir, "detector-scores.json"),
    scoring: path.join(dir, "scoring.js"),
    leaderboard: path.join(dir, "leaderboard.json"),
  };

  const presence = {
    manifest: await fileExists(paths.manifest),
    samples: await fileExists(paths.samples),
    tests: await fileExists(paths.tests),
    detectorScores: await fileExists(paths.detectorScores),
    scoring: await fileExists(paths.scoring),
    leaderboard: await fileExists(paths.leaderboard),
  };
  // leaderboard.json existed in pre-reproducibility cycles too, so it
  // doesn't count as a signal that this cycle should have a repro bundle.
  // Treat the cycle as pre-reproducibility when none of the NEW files are
  // present; treat it as a partial publish when only some are.
  const newFilesPresent = [
    presence.manifest,
    presence.samples,
    presence.tests,
    presence.detectorScores,
    presence.scoring,
  ];
  if (!newFilesPresent.some(Boolean)) {
    return { errors, humanizerCount: 0, skipped: true };
  }

  const missing = Object.entries(presence)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length > 0) {
    errors.push(
      `${cycleName}: partial reproducibility bundle, missing: ${missing.join(", ")}`,
    );
    return { errors, humanizerCount: 0, skipped: false };
  }

  // 1. Manifest integrity: every sibling file's SHA-256 matches.
  const manifest = await readJson<CycleManifest>(paths.manifest);
  const sha256OfFile = async (p: string) =>
    createHash("sha256")
      .update(await fs.readFile(p, "utf8"), "utf8")
      .digest("hex");
  const checks: Array<[string, string]> = [
    ["samples.json", paths.samples],
    ["tests.json", paths.tests],
    ["detector-scores.json", paths.detectorScores],
    ["scoring.js", paths.scoring],
  ];
  for (const [name, p] of checks) {
    const expected = manifest.files[name];
    if (!expected) {
      errors.push(`${cycleName}: cycle.json has no SHA for ${name}`);
      continue;
    }
    const actual = await sha256OfFile(p);
    if (expected !== actual) {
      errors.push(
        `${cycleName}: ${name} SHA mismatch — manifest ${expected}, actual ${actual}`,
      );
    }
  }

  // 2. Score replay.
  const samples = await readJson<unknown[]>(paths.samples);
  const tests = await readJson<unknown[]>(paths.tests);
  const detectorScores = await readJson<unknown[]>(paths.detectorScores);
  const leaderboard = await readJson<PublishedLeaderboard>(paths.leaderboard);

  const scoringUrl = pathToFileURL(paths.scoring).href;
  const scoring: ScoringModule = await import(scoringUrl);
  const replay = scoring.computeLeaderboard({
    samples,
    tests,
    detectorScores,
  });

  const replayBySlug = new Map(replay.humanizers.map((h) => [h.slug, h]));
  for (const published of leaderboard.humanizers) {
    const r = replayBySlug.get(published.slug);
    if (!r) {
      errors.push(`${cycleName}: humanizer "${published.slug}" not in replay output`);
      continue;
    }
    const ctx = `${cycleName} ${published.slug}`;
    diffNumeric(`${ctx} composite`, published.scores.composite, round(r.composite, 2), errors);
    diffNumeric(`${ctx} bypass_rate`, published.scores.bypass_rate, round(r.bypass_rate, 4), errors);
    diffNumeric(
      `${ctx} meaning_preservation`,
      published.scores.meaning_preservation,
      round(r.meaning_preservation, 4),
      errors,
    );
    diffNumeric(`${ctx} readability`, published.scores.readability, round(r.readability, 4), errors);
    diffNumeric(
      `${ctx} consistency_across_categories`,
      published.scores.consistency_across_categories,
      round(r.consistency_across_categories, 4),
      errors,
    );
    // Detector breakdown (published at 4 decimals)
    for (const [k, v] of Object.entries(published.detector_breakdown)) {
      const rv = r.detector_breakdown[k];
      if (rv == null) {
        errors.push(`${ctx} detector_breakdown[${k}] missing in replay`);
      } else {
        diffNumeric(`${ctx} detector_breakdown[${k}]`, v, round(rv, 4), errors);
      }
    }
    // Category breakdown (published at 4 decimals)
    for (const [k, v] of Object.entries(published.category_breakdown)) {
      const rv = r.category_breakdown[k];
      if (rv == null) {
        errors.push(`${ctx} category_breakdown[${k}] missing in replay`);
      } else {
        diffNumeric(`${ctx} category_breakdown[${k}]`, v, round(rv, 4), errors);
      }
    }
    // Penalties — compare by code + count (score_delta will follow from those).
    const publishedPenaltyCounts = new Map(
      published.penalties_applied.map((p) => [p.code, p.count]),
    );
    const replayPenaltyCounts = new Map(
      r.penalties_applied.map((p) => [p.code, p.count]),
    );
    for (const [code, count] of publishedPenaltyCounts) {
      const replayCount = replayPenaltyCounts.get(code) ?? 0;
      if (replayCount !== count) {
        errors.push(
          `${ctx} penalty[${code}] count mismatch — published ${count}, replay ${replayCount}`,
        );
      }
    }
    for (const [code, count] of replayPenaltyCounts) {
      if (!publishedPenaltyCounts.has(code) && count > 0) {
        errors.push(
          `${ctx} penalty[${code}] count ${count} in replay but absent from published`,
        );
      }
    }
  }

  return { errors, humanizerCount: replay.humanizers.length, skipped: false };
}

async function verifyCycle(cycleName: string): Promise<string[]> {
  const errors: string[] = [];
  const dir = path.join(CYCLES_DIR, cycleName);

  const transparency = await verifyTransparency(cycleName, dir);
  errors.push(...transparency.errors);

  if (transparency.skipped) {
    console.warn(`[skip] ${cycleName}: no transparency artifacts present`);
    return errors;
  }

  const reproducibility = await verifyReproducibility(cycleName, dir);
  errors.push(...reproducibility.errors);

  if (errors.length === 0) {
    const reproNote = reproducibility.skipped
      ? "no reproducibility bundle (pre-reproducibility cycle)"
      : `${reproducibility.humanizerCount} humanizers replayed`;
    console.log(
      `[ok] ${cycleName}: ${transparency.promptsCount} prompts verified, ${reproNote}`,
    );
  }
  return errors;
}

async function main() {
  const args = process.argv.slice(2);
  const positional = args.filter((a) => !a.startsWith("--"));
  const all = args.includes("--all") && positional.length === 0;
  let targets: string[];

  if (all || args.length === 0) {
    try {
      const entries = await fs.readdir(CYCLES_DIR, { withFileTypes: true });
      targets = entries.filter((d) => d.isDirectory()).map((d) => d.name);
    } catch (err) {
      // Missing data/cycles/ is a legitimate empty-repo state (pre-launch,
      // freshly initialized) — pass CI rather than crash.
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        targets = [];
      } else {
        throw err;
      }
    }
    if (targets.length === 0) {
      console.log("no cycles published yet — nothing to verify");
      return;
    }
  } else {
    targets = positional;
  }

  const errors: string[] = [];
  for (const cycle of targets) {
    const cycleErrors = await verifyCycle(cycle);
    errors.push(...cycleErrors);
  }

  if (errors.length > 0) {
    console.error("\nverify-cycle FAILED:");
    for (const e of errors) console.error("  - " + e);
    process.exit(1);
  }
  console.log("\nverify-cycle OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
