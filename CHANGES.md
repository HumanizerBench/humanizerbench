# HumanizerBench cycle changelog

Auto-generated from version-stamp diffs at publish time. Each entry shows
which methodology stamps moved between this cycle and the previous one,
with the rationale from the admin-side change log.

---

## July 2026 (published 2026-07-01)

**Changed since previous cycle:**

- **Methodology** (`methodology_version`): 1.0.0 → 1.2.0
  Each quality-failure penalty can subtract up to 10 points from a tool's composite
  score. The per-occurrence penalty amounts, the conditions that trigger each
  penalty, the four sub-scores, and the composite weights are all unchanged.

- **Scoring** (`scoring_version`): 1.0.0 → 1.3.0
  Each penalty category's cap is 10 points. Nothing else in the composite changes —
  the weights, the four sub-scores, the per-occurrence penalty amounts, and every
  penalty trigger are the same — so the leaderboard remains fully reproducible from
  the published per-test data via `npm run verify`.

No change in `prompt_set_version`.

📦 [Transparency bundle](data/cycles/July 2026/)

---

## June 2026 (published 2026-06-02)

First published cycle.

- `methodology_version`: 1.0.0
- `scoring_version`: 1.0.0
- `prompt_set_version`: 1.0.0

📦 [Transparency bundle](data/cycles/June 2026/)
