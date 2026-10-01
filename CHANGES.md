# HumanizerBench cycle changelog

Auto-generated from version-stamp diffs at publish time. Each entry shows
which methodology stamps moved between this cycle and the previous one,
with the rationale from the admin-side change log.

---

## October 2026 (published 2026-10-01)

**Changed since previous cycle:**

- **Methodology** (`methodology_version`): 1.2.0 → 1.3.0
  Pangram joins the detector panel, so every humanized output is now checked by six
  AI detectors: GPTZero, Originality.ai, Copyleaks, Winston AI, ZeroGPT and Pangram.
  Pangram runs its newest model, Pangram 4, and its score is the share of the text it
  rates as human-written, so text it rates as AI-assisted counts against the tool.
  Every detector runs its newest model, and the model version each vendor reports is
  now published with every score. Originality.ai is scored with its AI Allowance
  model at the vendor's default 15% setting, which replaced its retired classic
  models; the vendor moved all API requests to AI Allowance on August 25, 2026, so
  September 2026 was already scored with it. The AI-written source texts now come
  from GPT-6 Sol, Gemini 3.8 Flash and Claude Sonnet 5.5, the newest model from
  each of the three labs.

  Each output's detector-bypass score is now the average of every detector's
  verdict instead of the median. With six detectors the median only reflects the
  middle two, so a tool could be caught outright by two detectors and still score
  close to 100%. The average gives every detector equal weight, so a tool has to
  get past all of them to post a high bypass rate. The composite weights,
  penalties and other sub-scores are unchanged.

- **Scoring** (`scoring_version`): 1.3.0 → 1.4.0
  Per-test bypass in `scoring.js` is the mean of the detector scores for that
  output rather than the median, and the per-category bypass used for the
  consistency sub-score follows the same change. `detector-scores.json` now also
  records the model version each detector reported for each score, where the
  vendor reports one. Earlier cycles keep their own frozen `scoring.js`, so every
  published leaderboard still reproduces exactly via `npm run verify`.

No change in `prompt_set_version`.

📦 [Transparency bundle](data/cycles/October 2026/)

---

## September 2026 (published 2026-09-02)

No methodology, scoring, or prompt-set changes since the previous cycle.

- Current version stamps:
  - `methodology_version`: 1.2.0
  - `scoring_version`: 1.3.0
  - `prompt_set_version`: 1.0.0
📦 [Transparency bundle](data/cycles/September 2026/)

---

## August 2026 (published 2026-08-03)

No methodology, scoring, or prompt-set changes since the previous cycle.

- Current version stamps:
  - `methodology_version`: 1.2.0
  - `scoring_version`: 1.3.0
  - `prompt_set_version`: 1.0.0
📦 [Transparency bundle](data/cycles/August 2026/)

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
