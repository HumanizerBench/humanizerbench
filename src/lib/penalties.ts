import type { Penalty } from "./types";

export type PenaltyCode =
  | "short_output"
  | "refusal_in_output"
  | "identical_to_input"
  | "severe_meaning_drift"
  | "severe_grammar_degradation"
  | "length_inflation"
  | "tool_unavailable_run";

export interface PenaltyMeta {
  label: string;
  description: string;
  per: number;
  cap: number;
}

// Mirrors PENALTY_RULES + PENALTY_DESCRIPTIONS in benchmarkAdmin. If the rules
// change there, update both `per`/`cap` and the description text here.
export const PENALTY_META: Record<PenaltyCode, PenaltyMeta> = {
  identical_to_input: {
    label: "Identical to input",
    description:
      "The tool returned the input mostly unchanged — no real humanization happened.",
    per: 2.0,
    cap: 10.0,
  },
  refusal_in_output: {
    label: "Refusal",
    description:
      "The tool refused to humanize the input, often due to a content-policy block.",
    per: 1.0,
    cap: 8.0,
  },
  severe_grammar_degradation: {
    label: "Grammar degradation",
    description:
      "The output introduced noticeably more grammar errors than the input.",
    per: 1.0,
    cap: 8.0,
  },
  severe_meaning_drift: {
    label: "Meaning drift",
    description:
      "The output's meaning drifted significantly from the original input.",
    per: 0.5,
    cap: 5.0,
  },
  short_output: {
    label: "Short output",
    description:
      "The output came back much shorter than expected — likely truncated or near-empty.",
    per: 0.4,
    cap: 4.0,
  },
  length_inflation: {
    label: "Length inflation",
    description:
      "The output ran much longer than the input — a common trick that pads text to dilute the AI signal.",
    per: 0.6,
    cap: 4.0,
  },
  tool_unavailable_run: {
    label: "Tool unavailable",
    description:
      "The tool was frequently unavailable during testing (site down, paywall, or captcha).",
    per: 3.0,
    cap: 3.0,
  },
};

// Display order: worst cap first.
export const PENALTY_CODE_ORDER: PenaltyCode[] = [
  "identical_to_input",
  "refusal_in_output",
  "severe_grammar_degradation",
  "severe_meaning_drift",
  "short_output",
  "length_inflation",
  "tool_unavailable_run",
];

export const MAX_TOTAL_PENALTY = PENALTY_CODE_ORDER.reduce(
  (sum, code) => sum + PENALTY_META[code].cap,
  0,
);

export interface PenaltySummary {
  totalDelta: number;
  count: number;
}

export function summarizePenalties(applied: Penalty[]): PenaltySummary {
  let totalDelta = 0;
  for (const p of applied) totalDelta += p.score_delta;
  return { totalDelta, count: applied.length };
}

export function getPenaltyMeta(code: string): PenaltyMeta | null {
  return PENALTY_META[code as PenaltyCode] ?? null;
}

// "−2.1" with a real minus sign; always shows sign so penalty chips read clearly.
export function fmtPenaltyDelta(delta: number): string {
  return `−${Math.abs(delta).toFixed(1)}`;
}
