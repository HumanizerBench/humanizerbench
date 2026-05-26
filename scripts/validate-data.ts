import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  Cycle,
  Humanizer,
  HumanizerHistory,
  HumanizerHistoryPoint,
} from "../src/lib/types.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_ROOT = path.resolve(__dirname, "../data");

const errors: string[] = [];

function check(cond: boolean, msg: string) {
  if (!cond) errors.push(msg);
}

function isNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

function isString(x: unknown): x is string {
  return typeof x === "string";
}

function validateHumanizer(h: Humanizer, ctx: string) {
  check(isString(h.slug), `${ctx} missing slug`);
  check(isString(h.name), `${ctx} missing name`);
  check(isString(h.url), `${ctx} missing url`);
  check(isNumber(h.rank), `${ctx} missing rank`);
  check(isNumber(h.rank_change), `${ctx} missing rank_change`);
  check(isString(h.last_tested_at), `${ctx} missing last_tested_at`);
  check(typeof h.scores === "object", `${ctx} missing scores`);
  const sKeys = [
    "composite",
    "bypass_rate",
    "meaning_preservation",
    "readability",
    "consistency_across_categories",
    "speed_seconds",
    "cost_per_1k_words_usd",
  ] as const;
  for (const k of sKeys) {
    check(isNumber(h.scores?.[k]), `${ctx} scores.${k} not number`);
  }
  check(
    Array.isArray(h.score_intervals?.bypass_rate_ci_95) &&
      h.score_intervals.bypass_rate_ci_95.length === 2,
    `${ctx} score_intervals.bypass_rate_ci_95 malformed`,
  );
  check(
    Array.isArray(h.score_intervals?.meaning_preservation_ci_95) &&
      h.score_intervals.meaning_preservation_ci_95.length === 2,
    `${ctx} score_intervals.meaning_preservation_ci_95 malformed`,
  );
  check(Array.isArray(h.penalties_applied), `${ctx} penalties_applied not array`);
  check(
    h.confidence === "high" ||
      h.confidence === "medium" ||
      h.confidence === "low",
    `${ctx} confidence invalid`,
  );
  check(
    typeof h.detector_breakdown === "object" &&
      h.detector_breakdown !== null,
    `${ctx} detector_breakdown missing`,
  );
  check(
    typeof h.category_breakdown === "object" &&
      h.category_breakdown !== null,
    `${ctx} category_breakdown missing`,
  );
  check(typeof h.pricing === "object", `${ctx} pricing missing`);
  check(isNumber(h.pricing?.monthly_usd), `${ctx} pricing.monthly_usd not number`);
  check(typeof h.pricing?.free_tier === "boolean", `${ctx} pricing.free_tier not bool`);
  check(
    h.pricing?.free_tier_word_limit === null ||
      isNumber(h.pricing?.free_tier_word_limit),
    `${ctx} pricing.free_tier_word_limit invalid`,
  );
  check(isNumber(h.sample_count), `${ctx} sample_count not number`);
  check(isNumber(h.successful_test_count), `${ctx} successful_test_count not number`);
  check(isNumber(h.flagged_test_count), `${ctx} flagged_test_count not number`);
}

function validateCycle(cycle: Cycle, ctx: string) {
  check(isString(cycle.cycle), `${ctx} missing cycle`);
  check(isString(cycle.generated_at), `${ctx} missing generated_at`);
  check(isString(cycle.methodology_version), `${ctx} missing methodology_version`);
  check(isString(cycle.scoring_version), `${ctx} missing scoring_version`);
  check(isString(cycle.prompt_set_version), `${ctx} missing prompt_set_version`);
  check(
    isString(cycle.detector_config_version),
    `${ctx} missing detector_config_version`,
  );
  check(
    isString(cycle.humanizer_config_version),
    `${ctx} missing humanizer_config_version`,
  );
  check(
    typeof cycle.source_model_versions === "object",
    `${ctx} missing source_model_versions`,
  );
  check(isNumber(cycle.cycle_sample_count), `${ctx} missing cycle_sample_count`);
  check(Array.isArray(cycle.humanizers), `${ctx} humanizers not array`);
  cycle.humanizers.forEach((h, i) =>
    validateHumanizer(h, `${ctx}.humanizers[${i}]`),
  );
}

function validateHistoryPoint(p: HumanizerHistoryPoint, ctx: string) {
  check(isString(p.cycle), `${ctx} missing cycle`);
  check(isNumber(p.composite), `${ctx} composite not number`);
  check(isNumber(p.bypass_rate), `${ctx} bypass_rate not number`);
  check(
    typeof p.detector_breakdown === "object",
    `${ctx} detector_breakdown missing`,
  );
  check(
    typeof p.category_breakdown === "object",
    `${ctx} category_breakdown missing`,
  );
}

function validateHistory(h: HumanizerHistory, ctx: string) {
  check(isString(h.slug), `${ctx} missing slug`);
  check(Array.isArray(h.points), `${ctx} points not array`);
  h.points.forEach((p, i) => validateHistoryPoint(p, `${ctx}.points[${i}]`));
}

async function main() {
  const cyclesDir = path.join(DATA_ROOT, "cycles");
  const cycleDirs = await fs.readdir(cyclesDir, { withFileTypes: true });
  for (const d of cycleDirs) {
    if (!d.isDirectory()) continue;
    const fp = path.join(cyclesDir, d.name, "leaderboard.json");
    const raw = await fs.readFile(fp, "utf8");
    const json = JSON.parse(raw) as Cycle;
    validateCycle(json, `cycles/${d.name}`);
  }

  const humanizersDir = path.join(DATA_ROOT, "humanizers");
  const files = await fs.readdir(humanizersDir);
  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    const raw = await fs.readFile(path.join(humanizersDir, f), "utf8");
    const json = JSON.parse(raw) as HumanizerHistory;
    validateHistory(json, `humanizers/${f}`);
  }

  if (errors.length > 0) {
    console.error("validate-data FAILED:");
    for (const e of errors) console.error("  - " + e);
    process.exit(1);
  }
  console.log("validate-data OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
