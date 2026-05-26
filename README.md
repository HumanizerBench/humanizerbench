# HumanizerBench

Public audit record for [HumanizerBench](https://github.com/HumanizerBench/humanizerbench) — an independent benchmark that scores AI humanizer tools on how well they evade commercial AI detectors while preserving the meaning and readability of the source text.

This repository contains:

- The **leaderboard data** for every published cycle, under `data/cycles/`.
- The **per-cycle transparency bundle** for every published cycle (prompts, banks, algorithm, nonce, hash commitment) — see [Per-cycle audit bundle](#per-cycle-audit-bundle) below.
- The **methodology**, rendered at `/methodology` on the live site and authored in [`src/pages/methodology.astro`](src/pages/methodology.astro).
- The **verifier** at [`scripts/verify-cycle.ts`](scripts/verify-cycle.ts) — an independent script anyone can run to prove a cycle wasn't tampered with after the fact.

The benchmark itself runs from a separate private repo. This public repo receives the artifacts each cycle produces; it does not contain the scoring pipeline, detector API keys, or anything that would let you re-score a humanizer offline. What it contains is everything needed to **audit** a published cycle.

## Repository layout

```
data/
  cycles/
    <cycle>/
      commit.json              # sha256(nonce) — published at cycle start
      nonce.txt                # the nonce — published at cycle close
      prompts.json             # resolved prompts (templates with placeholders filled)
      templates.json           # the prompt templates (with [BRACKETED] tokens)
      banks.json               # the value banks the placeholders are drawn from
      select-placeholders.js   # the frozen selection algorithm
      leaderboard.json         # final scores for the cycle
  humanizers/
    <slug>.json                # per-humanizer history across all cycles
scripts/
  verify-cycle.ts              # the audit script (see below)
src/
  pages/methodology.astro      # methodology page rendered on the live site
  ...                          # the rest of the Astro site
```

## Per-cycle audit bundle

Every published cycle ships seven files under `data/cycles/<cycle>/`:

| File | Purpose |
|---|---|
| `commit.json` | Hash commitment — published **at cycle start**, before any humanizer is scored. Contains `sha256(nonce)` and the cycle's start timestamp. The nonce itself stays private during the cycle. |
| `nonce.txt` | The 32-byte hex nonce — published **at cycle close**, after all humanizers have been scored. Hashing this produces `commit.json.committed_hash`. |
| `templates.json` | The raw prompt templates active at cycle creation, each containing `[BRACKETED]` placeholder tokens. |
| `banks.json` | The curated value bank for every placeholder token (e.g. a list of topics for `[TOPIC]`). |
| `select-placeholders.js` | A self-contained ESM module — the frozen selection algorithm at the time the cycle ran. Takes `(nonce, templates, banks)` and returns the per-prompt placeholder map. |
| `prompts.json` | The resolved final prompts (templates with placeholders substituted) — what every humanizer was actually tested against. |
| `leaderboard.json` | Final composite scores, sub-scores, detector breakdowns, penalties, and per-humanizer metadata. |

The first six files together form an immutable audit trail of *what was tested* in the cycle. The seventh records *what the results were*. The verifier proves the first six are internally consistent.

## How to verify a cycle

```bash
git clone https://github.com/HumanizerBench/humanizerbench.git
cd humanizerbench
npm install
npm run verify              # verify every published cycle
npm run verify -- <cycle>   # verify one cycle, e.g. 2026-06
```

A successful verification looks like:

```
[ok] 2026-06: 72 prompts verified
verify-cycle OK
```

A tampered cycle looks like:

```
verify-cycle FAILED:
  - 2026-06: sha256(nonce) mismatch — expected <hash-A>, got <hash-B>
  - 2026-06: resolved text for "academic_essay_1" differs from published
```

The script runs three independent checks for each cycle:

1. **Hash commitment** — `sha256(nonce.txt) === commit.json.committed_hash`. Proves the nonce revealed at cycle close is the same one whose hash was published at cycle start.
2. **Algorithm replay** — re-runs the frozen `select-placeholders.js` against `nonce.txt`, `templates.json`, and `banks.json` to re-derive the placeholder map.
3. **Substitution match** — substitutes the re-derived placeholders into the templates and asserts the resulting prompts equal `prompts.json` byte-for-byte.

If all three pass for every cycle, no one — including the benchmark operator — could have altered the prompts after the cycle started without breaking the chain.

## The commit-reveal scheme in one paragraph

Cycle names are predictable (`2026-06`, then `2026-07`, …). If placeholder selection were seeded on the cycle name, a humanizer with access to the public banks and algorithm could pre-compute next month's prompts and fine-tune against them. Instead, each cycle is seeded by a random 32-byte nonce that is generated at cycle creation and kept private during the cycle. Only `sha256(nonce)` is published at start. At cycle close, after every humanizer has been scored against the prompts derived from that nonce, the nonce itself is published — and anyone can re-derive the prompts and check the hash. Vendors get auditability; they don't get predictability. The full version of this argument is on the [methodology page](src/pages/methodology.astro).

## Corrections and disputes

If you spot an error in a cycle — a bad score, a stale humanizer record, a verifier failure on a cycle that should be clean — open an issue in this repo or follow the contact path on the live site's `/fairness` page. We aim to respond within one cycle.
