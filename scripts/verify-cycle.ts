/**
 * Independently verify a cycle's commit-reveal transparency artifacts.
 *
 * For each cycle directory under `data/cycles/`:
 *
 *   1. Read `commit.json` (published at cycle start) and `nonce.txt`
 *      (published at cycle close). Confirm sha256(nonce) === committed_hash.
 *   2. Load the frozen `select-placeholders.js` algorithm shipped with the
 *      cycle, plus its sibling `templates.json` and `banks.json`.
 *   3. Re-derive the placeholder map from (nonce, templates, banks) using
 *      the frozen algorithm. Re-substitute placeholders. Confirm the
 *      resulting per-prompt strings match `prompts.json` exactly.
 *
 * Cycles that pre-date the transparency artifacts (e.g. legacy seed data
 * with only a `leaderboard.json`) are skipped with a warning, not failed.
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

async function verifyCycle(cycleName: string): Promise<string[]> {
  const errors: string[] = [];
  const dir = path.join(CYCLES_DIR, cycleName);

  const commitPath = path.join(dir, "commit.json");
  const noncePath = path.join(dir, "nonce.txt");
  const promptsPath = path.join(dir, "prompts.json");
  const templatesPath = path.join(dir, "templates.json");
  const banksPath = path.join(dir, "banks.json");
  const algoPath = path.join(dir, "select-placeholders.js");

  const hasAny = await Promise.all(
    [commitPath, noncePath, promptsPath, templatesPath, banksPath, algoPath].map(
      fileExists,
    ),
  );
  if (!hasAny.some(Boolean)) {
    console.warn(`[skip] ${cycleName}: no transparency artifacts present`);
    return errors;
  }

  // From here on, every artifact is required.
  const missing: string[] = [];
  if (!hasAny[0]) missing.push("commit.json");
  if (!hasAny[1]) missing.push("nonce.txt");
  if (!hasAny[2]) missing.push("prompts.json");
  if (!hasAny[3]) missing.push("templates.json");
  if (!hasAny[4]) missing.push("banks.json");
  if (!hasAny[5]) missing.push("select-placeholders.js");
  if (missing.length > 0) {
    errors.push(`${cycleName}: partial transparency bundle, missing: ${missing.join(", ")}`);
    return errors;
  }

  const commit = await readJson<CommitJson>(commitPath);
  const nonce = (await fs.readFile(noncePath, "utf8")).trim();
  const templates = await readJson<TemplateRow[]>(templatesPath);
  const banks = await readJson<Record<string, readonly string[]>>(banksPath);
  const expectedPrompts = await readJson<ResolvedPrompt[]>(promptsPath);

  // 1. Hash matches the public commitment.
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

  // 2. Re-run the frozen algorithm.
  const algoUrl = pathToFileURL(algoPath).href;
  const algo: SelectModule = await import(algoUrl);
  const placeholders = algo.selectPlaceholdersForCycle(nonce, templates, banks);

  // 3. Re-substitute and compare to prompts.json.
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
      errors.push(
        `${cycleName}: template for "${r.slug}" differs from published`,
      );
    }
    if (JSON.stringify(e.placeholders) !== JSON.stringify(r.placeholders)) {
      errors.push(
        `${cycleName}: placeholders for "${r.slug}" differ from published`,
      );
    }
  }

  if (errors.length === 0) {
    console.log(`[ok] ${cycleName}: ${rederived.length} prompts verified`);
  }
  return errors;
}

async function main() {
  const args = process.argv.slice(2);
  const all = args.includes("--all");
  let targets: string[];

  if (all || args.length === 0) {
    const entries = await fs.readdir(CYCLES_DIR, { withFileTypes: true });
    targets = entries.filter((d) => d.isDirectory()).map((d) => d.name);
  } else {
    targets = args.filter((a) => !a.startsWith("--"));
  }

  if (targets.length === 0) {
    console.error("no cycles to verify");
    process.exit(1);
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
