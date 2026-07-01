// Frozen at cycle close. Re-run by benchmarkPublic/scripts/verify-cycle.ts.
// Pure ESM, no dependencies. Inputs are loaded from sibling JSON files.
//
// Aggregates per-test detector scores + pre-computed meaning_preservation and
// readability into the per-humanizer composite scores published in
// leaderboard.json. Both per-test values are published with the cycle as raw
// data and only averaged here — this script calls no model and no detector, so
// the leaderboard reproduces exactly from the published files. meaning_
// preservation is the input/output embedding cosine; readability is a language-
// model writing-quality rating of the output (scoring_version 1.1.0+; earlier
// cycles used a grammar-error rate). Weights, penalty rules, and the length-
// inflation threshold are inlined as constants below — they match what admin
// used at publish time. To trace the rationale, see methodology_version on
// leaderboard.json and the matching version of methodology.astro.

const WEIGHTS = {"bypass_rate":42,"meaning_preservation":32,"readability":16,"consistency_across_categories":10};
const PENALTY_RULES = {"refusal_in_output":{"per":1,"cap":10},"identical_to_input":{"per":2,"cap":10},"severe_meaning_drift":{"per":1,"cap":10},"length_inflation":{"per":1,"cap":10},"length_deflation":{"per":1,"cap":10}};
const LENGTH_INFLATION_RATIO_THRESHOLD = 1.4;
const LENGTH_DEFLATION_RATIO_THRESHOLD = 0.6;
const MEANING_COSINE_FLOOR = 0.75;

// 1.6.0: per-test meaning_preservation is published as raw embedding cosine;
// the aggregated sub-score rescales [MEANING_COSINE_FLOOR, 1] -> [0, 1] so the
// realistic on-topic band spreads across the full scale. severe_meaning_drift
// still triggers on the raw per-test value below.
function rescaleMeaning(cosine) {
  const span = 1 - MEANING_COSINE_FLOOR;
  return Math.max(0, Math.min(1, (cosine - MEANING_COSINE_FLOOR) / span));
}

function mean(xs) {
  if (!xs.length) return 0;
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

function median(xs) {
  if (!xs.length) return 0;
  const sorted = xs.slice().sort((a, b) => a - b);
  const n = sorted.length;
  const mid = Math.floor(n / 2);
  return n % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function stddev(xs) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  let s = 0;
  for (const x of xs) s += (x - m) ** 2;
  return Math.sqrt(s / (xs.length - 1));
}

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function computeRawComposite(a) {
  return (
    WEIGHTS.bypass_rate * a.bypass_rate +
    WEIGHTS.meaning_preservation * a.meaning_preservation +
    WEIGHTS.readability * a.readability +
    WEIGHTS.consistency_across_categories * a.consistency_across_categories
  );
}

function applyPenalties(rawComposite, counts) {
  const applied = [];
  let totalDelta = 0;
  for (const code of Object.keys(counts)) {
    const count = counts[code];
    if (!count) continue;
    const rule = PENALTY_RULES[code];
    if (!rule) continue;
    const delta = -Math.min(count * rule.per, rule.cap);
    if (delta < 0) {
      applied.push({ code, count, score_delta: delta });
      totalDelta += delta;
    }
  }
  return {
    composite: Math.max(0, rawComposite + totalDelta),
    penalties_applied: applied,
  };
}

/**
 * Aggregate the per-cycle raw artifacts into per-humanizer scores. Pure
 * function from JSON inputs to JSON output — no I/O.
 */
export function computeLeaderboard({ samples, tests, detectorScores }) {
  const sampleById = new Map(samples.map((s) => [s.id, s]));
  const scoresByTest = new Map();
  for (const s of detectorScores) {
    const m = scoresByTest.get(s.test_id) ?? {};
    m[s.detector_slug] = s.raw_score;
    scoresByTest.set(s.test_id, m);
  }

  const completeByHumanizer = new Map();
  const flaggedByHumanizer = new Map();
  for (const t of tests) {
    if (t.status === "complete") {
      const a = completeByHumanizer.get(t.humanizer_slug) ?? [];
      a.push(t);
      completeByHumanizer.set(t.humanizer_slug, a);
    } else if (t.status === "flagged") {
      const a = flaggedByHumanizer.get(t.humanizer_slug) ?? [];
      a.push(t);
      flaggedByHumanizer.set(t.humanizer_slug, a);
    }
  }

  const computed = [];
  for (const [slug, hTests] of completeByHumanizer) {
    const flagged = flaggedByHumanizer.get(slug) ?? [];

    const perTestBypass = hTests.map((t) =>
      median(Object.values(scoresByTest.get(t.id) ?? {})),
    );
    const bypassRate = mean(perTestBypass);
    const meaning = mean(
      hTests.map((t) => rescaleMeaning(t.meaning_preservation ?? 0)),
    );
    const read = mean(hTests.map((t) => t.readability ?? 0));

    // Detector breakdown — mean per detector
    const allDetectorSlugs = new Set();
    for (const t of hTests) {
      for (const s of Object.keys(scoresByTest.get(t.id) ?? {})) {
        allDetectorSlugs.add(s);
      }
    }
    const detectorBreakdown = {};
    for (const dSlug of allDetectorSlugs) {
      const values = hTests
        .map((t) => (scoresByTest.get(t.id) ?? {})[dSlug])
        .filter((v) => typeof v === "number");
      detectorBreakdown[dSlug] = mean(values);
    }

    // Category breakdown — mean per category of per-test medians
    const categoryBreakdown = {};
    const allCategories = new Set();
    for (const t of hTests) {
      const cat = sampleById.get(t.sample_id)?.category ?? "unknown";
      allCategories.add(cat);
    }
    for (const cat of allCategories) {
      const inCat = hTests.filter(
        (t) => (sampleById.get(t.sample_id)?.category ?? "unknown") === cat,
      );
      const bypassMediansInCat = inCat.map((t) =>
        median(Object.values(scoresByTest.get(t.id) ?? {})),
      );
      categoryBreakdown[cat] = mean(bypassMediansInCat);
    }
    const stddevCats = stddev(Object.values(categoryBreakdown));
    const consistency =
      allCategories.size < 3 ? 0.5 : Math.max(0, 1 - stddevCats);

    const rawComp = computeRawComposite({
      bypass_rate: bypassRate,
      meaning_preservation: meaning,
      readability: read,
      consistency_across_categories: consistency,
    });

    // Penalty counts
    const counts = {
      refusal_in_output: 0,
      identical_to_input: 0,
      severe_meaning_drift: 0,
      length_inflation: 0,
      length_deflation: 0,
    };
    for (const t of hTests) {
      if ((t.meaning_preservation ?? 1) < 0.85) counts.severe_meaning_drift++;
      const inWords = wordCount(t.input_text);
      const outWords = wordCount(t.output_text ?? "");
      if (inWords > 0 && outWords / inWords > LENGTH_INFLATION_RATIO_THRESHOLD) {
        counts.length_inflation++;
      }
      if (inWords > 0 && outWords / inWords < LENGTH_DEFLATION_RATIO_THRESHOLD) {
        counts.length_deflation++;
      }
    }
    for (const f of flagged) {
      switch (f.failure_reason_code) {
        case "refusal_in_output":
        case "refused_input":
          counts.refusal_in_output++;
          break;
        case "identical_to_input":
          counts.identical_to_input++;
          break;
      }
    }
    const attempted = hTests.length + flagged.length;
    const { composite, penalties_applied } = applyPenalties(rawComp, counts);

    let confidence = "low";
    if (hTests.length >= 60 && stddevCats < 0.1) confidence = "high";
    else if (hTests.length >= 30) confidence = "medium";

    computed.push({
      slug,
      composite_raw: rawComp,
      composite,
      bypass_rate: bypassRate,
      meaning_preservation: meaning,
      readability: read,
      consistency_across_categories: consistency,
      detector_breakdown: detectorBreakdown,
      category_breakdown: categoryBreakdown,
      penalties_applied,
      successful_test_count: hTests.length,
      flagged_test_count: flagged.length,
      sample_count: attempted,
      confidence,
    });
  }

  computed.sort(
    (a, b) =>
      b.composite - a.composite ||
      (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0),
  );
  return { humanizers: computed };
}
