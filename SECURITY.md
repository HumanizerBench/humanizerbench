# Security & responsible disclosure

This repository is the public audit record for HumanizerBench. Three kinds of
issue belong in this file's reporting path:

1. **Verifier bugs** — `scripts/verify-cycle.ts` accepts a cycle that an
   independent computation says it shouldn't, or rejects a cycle that's
   actually valid.
2. **Methodology / data tampering** — evidence that a published cycle's data
   was altered after the nonce was revealed, or that the methodology
   described in CHANGES.md doesn't match the frozen `scoring.js` for a given
   cycle.
3. **Repo-side security issues** — secrets accidentally committed, malicious
   content in the data tree, or anything else that compromises the
   integrity of the audit record itself.

## How to report

Please email **contact@humanizerbench.com** with the subject line
`[HumanizerBench security]`. Include:

- The cycle (or cycles) affected, if applicable
- A minimal reproduction or chain of evidence
- Your preferred attribution (or "anonymous")

You will receive an acknowledgment within 3 business days. We aim to resolve
high-severity issues — or publish a disclosure if a fix would compromise
auditability — within one cycle (typically 30 days).

For non-security audit findings (a humanizer ranked wrong, a stale entry, a
typo in the methodology page), open a regular GitHub issue instead — those
don't need private handling.

## Scope

In scope:
- `scripts/verify-cycle.ts` and the verify CI workflow
- `data/cycles/*` and `data/humanizers/*` integrity
- This repository's own configuration (workflows, secrets, branch
  protection)

Out of scope:
- The benchmark operator's private infrastructure (admin app, Supabase,
  Cloudflare configuration). Bugs there should be reported privately to
  the operator at the email above, but won't be acknowledged publicly.
- Vulnerabilities in dependencies (`tsx`, Node, etc.) — please report
  upstream first.
- Bugs in the public site (humanizerbench.com) — those belong in the site
  repository, [HumanizerBench/humanizerbench-site](https://github.com/HumanizerBench/humanizerbench-site).

## What we won't do

We won't take legal action against good-faith security research that
respects the scope above and gives us a reasonable window to fix issues
before public disclosure. We don't run a paid bounty program.
