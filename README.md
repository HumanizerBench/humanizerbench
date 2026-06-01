# HumanizerBench: AI Humanizer Rankings & Public Audit Record

**The best AI humanizers, ranked by a monthly benchmark.** HumanizerBench measures how well each AI humanizer bypasses the major AI detectors (GPTZero, Originality.ai, Copyleaks, Winston AI, and ZeroGPT) while preserving the original meaning and readability. We pay for every tool ourselves and run each one by hand on the most undetectable setting it advertises; there are no affiliate deals and no vendor-supplied numbers. Every input, every humanized output, every detector verdict, and the scoring code itself is published in this repository, so anyone can reproduce the rankings from scratch.

<!-- RANKINGS:START -->
## 🏆 Best AI humanizers: b 2026

| # | AI humanizer | Score / 100 | Bypass | Meaning | Readability | Consistency |
|--:|--------------|:-----------:|:------:|:-------:|:-----------:|:-----------:|
| 1 | [HIX Bypass](https://humanizerbench.com/humanizers/hix-bypass) | 85.3 | 97% | 74% | 100% | 50% |
| 2 | [Super Humanizer](https://humanizerbench.com/humanizers/super-humanizer) | 84.7 | 99% | 69% | 100% | 50% |
| 3 | [Phrasly](https://humanizerbench.com/humanizers/phrasly) | 84.5 | 100% | 68% | 100% | 50% |
| 4 | [Humbot](https://humanizerbench.com/humanizers/humbot) | 84.1 | 91% | 77% | 100% | 50% |
| 5 | [Walter Writes](https://humanizerbench.com/humanizers/walter-writes) | 83.4 | 100% | 64% | 100% | 50% |
| 6 | [Undetectable.ai](https://humanizerbench.com/humanizers/undetectable) | 82.0 | 100% | 62% | 100% | 50% |
| 7 | [Stealth Writer](https://humanizerbench.com/humanizers/stealth-writer) | 80.5 | 89% | 69% | 100% | 50% |
| 8 | [AI Humanize io](https://humanizerbench.com/humanizers/ai-humanize-io) | 80.3 | 100% | 56% | 100% | 50% |
| 9 | [WriteHuman](https://humanizerbench.com/humanizers/writehuman) | 79.6 | 91% | 63% | 100% | 50% |
| 10 | [Humanize AI Pro](https://humanizerbench.com/humanizers/humanize-ai-pro) | 78.0 | 86% | 65% | 100% | 50% |
| 11 | [BypassGPT](https://humanizerbench.com/humanizers/bypassgpt) | 54.1 | 23% | 73% | 100% | 50% |
| 12 | [Grammarly](https://humanizerbench.com/humanizers/grammarly) | 51.2 | 0% | 94% | 100% | 50% |
| 13 | [NoteGPT](https://humanizerbench.com/humanizers/notegpt) | 41.4 | 0% | 64% | 100% | 50% |

_The composite (out of 100) weights detector bypass (42%), meaning preservation (32%), readability (16%), and consistency across writing categories (10%); the remaining columns are those sub-scores. We pay for every tool ourselves and run each one by hand on its most undetectable advertised setting. Scored against 5 AI detectors; every score is reproducible from the data in this repo. See the full leaderboard with per-detector breakdowns and 12-month trends at [humanizerbench.com/leaderboard](https://humanizerbench.com/leaderboard)._
<!-- RANKINGS:END -->

### [See the full leaderboard at humanizerbench.com →](https://humanizerbench.com/leaderboard)

Per-detector breakdowns, meaning & readability sub-scores, penalties, pricing, and 12-month trends for every humanizer.

This repository is the **public audit record**: the live site at [humanizerbench.com](https://humanizerbench.com) is rendered from the data here, and anyone can clone this repo and prove every published cycle wasn't tampered with.

## What's in here

```
data/
  cycles/
    <cycle>/                   # one directory per published cycle
      # Transparency bundle (proves prompts weren't predictable or swapped)
      commit.json              # sha256(nonce), published at cycle start
      nonce.txt                # the nonce, published at cycle close
      prompts.json             # resolved prompts (templates with placeholders filled)
      templates.json           # the prompt templates (with [BRACKETED] tokens)
      banks.json               # the value banks the placeholders are drawn from
      select-placeholders.js   # the frozen selection algorithm
      # Reproducibility bundle (lets you re-derive the leaderboard)
      samples.json             # the source samples (input texts)
      tests.json               # every humanizer's output + per-test metrics
      detector-scores.json     # every detector verdict on every output
      scoring.js               # the frozen scoring aggregator
      cycle.json               # SHA-256 manifest of every per-cycle file above
      # Final result
      leaderboard.json         # composite + sub-scores per humanizer
  humanizers/
    <slug>.json                # per-humanizer history across all cycles
scripts/
  verify-cycle.ts              # the audit script (see below)
CHANGES.md                     # cycle-to-cycle methodology changelog
```

The benchmark itself runs from a separate private repo (corpus generation, detector integrations, humanizer adapters, API keys). This public repo receives every input, every output, every detector verdict, and a frozen copy of the scoring algorithm each cycle produces, enough that anyone can **re-derive the leaderboard from scratch**, not just spot-check it.

## How to verify a cycle

```bash
git clone https://github.com/HumanizerBench/humanizerbench.git
cd humanizerbench
npm install
npm run verify                                    # verify every published cycle
npx tsx scripts/verify-cycle.ts "January 2026"    # verify one cycle
```

A successful verification looks like:

```
[ok] January 2026: 72 prompts verified, 6 humanizers replayed
verify-cycle OK
```

A tampered cycle looks like:

```
verify-cycle FAILED:
  - January 2026: sha256(nonce) mismatch, expected <hash-A>, got <hash-B>
  - January 2026: resolved text for "academic_essay_1" differs from published
```

The script runs five separate checks for each cycle:

1. **Hash commitment.** `sha256(nonce.txt) === commit.json.committed_hash`. Proves the nonce revealed at cycle close is the same one whose hash was published at cycle start.
2. **Algorithm replay.** Re-runs the frozen `select-placeholders.js` against `nonce.txt`, `templates.json`, and `banks.json` to re-derive the placeholder map.
3. **Substitution match.** Substitutes the re-derived placeholders into the templates and asserts the resulting prompts equal `prompts.json` byte-for-byte.
4. **Manifest integrity.** For every entry in `cycle.json.files`, recomputes the SHA-256 of the named file and asserts it matches the manifest. The four reproducibility data files (`samples.json`, `tests.json`, `detector-scores.json`, `scoring.js`) are required-minimum entries; recent cycles also manifest the transparency bundle (`commit.json`, `nonce.txt`, `prompts.json`, `templates.json`, `banks.json`, `select-placeholders.js`) and the published `leaderboard.json`. Unknown filenames in the manifest are rejected. Catches truncated, corrupted, or doctored publishes.
5. **Score replay.** Runs the frozen `scoring.js` against the raw data and asserts every humanizer's composite, sub-scores, detector breakdown, category breakdown, and penalty counts match `leaderboard.json` within `1e-4`.

If all five pass for every cycle, no one (including the benchmark operator) could have altered the prompts, inputs, outputs, detector verdicts, or scoring math after the cycle started without breaking the chain.

The verifier is also wired into CI on this repo: every push to `main` runs `npm run verify` and fails the build if any cycle's chain has broken.

## The commit-reveal scheme in one paragraph

Cycle names are predictable (`January 2026`, then `February 2026`, and so on). If placeholder selection were seeded on the cycle name, a humanizer with access to the public banks and algorithm could pre-compute next month's prompts and fine-tune against them. Instead, each cycle is seeded by a random 32-byte nonce that is generated at cycle creation and kept private during the cycle. Only `sha256(nonce)` is published at start. At cycle close, after every humanizer has been scored against the prompts derived from that nonce, the nonce itself is published, and anyone can re-derive the prompts and check the hash. Vendors get auditability; they don't get predictability. The full version of this argument is on the [methodology page](https://humanizerbench.com/methodology).

## Corrections and disputes

If you spot an error in a cycle (a bad score, a stale humanizer record, a verifier failure on a cycle that should be clean), open an issue in this repo or follow the contact path on the live site's `/fairness` page. We aim to respond within one cycle.

## License

- Verifier code, workflows, and configuration: [MIT](LICENSE).
- Cycle data under `data/`: [CC BY 4.0](LICENSE-data). Reproduction with attribution is welcome.
- The name "HumanizerBench" and associated branding are not licensed for reuse on competing benchmark services or AI-detector-evasion products.

## Reporting issues

Found a verifier bug, a tampered cycle, or a security issue with this repo? See [SECURITY.md](SECURITY.md). For non-security audit findings, open a regular GitHub issue.
