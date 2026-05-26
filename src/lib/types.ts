export interface Scores {
  composite: number;
  bypass_rate: number;
  meaning_preservation: number;
  readability: number;
  consistency_across_categories: number;
  speed_seconds: number;
  cost_per_1k_words_usd: number;
}

export interface ScoreIntervals {
  bypass_rate_ci_95: [number, number];
  meaning_preservation_ci_95: [number, number];
}

export interface Penalty {
  code: string;
  count: number;
  score_delta: number;
}

export type DetectorBreakdown = Record<string, number>;
export type CategoryBreakdown = Record<string, number>;

export interface Pricing {
  monthly_usd: number;
  free_tier: boolean;
  free_tier_word_limit: number | null;
}

export type Confidence = "high" | "medium" | "low";

export interface Humanizer {
  slug: string;
  name: string;
  url: string;
  rank: number;
  rank_change: number;
  last_tested_at: string;
  scores: Scores;
  score_intervals: ScoreIntervals;
  penalties_applied: Penalty[];
  confidence: Confidence;
  detector_breakdown: DetectorBreakdown;
  category_breakdown: CategoryBreakdown;
  pricing: Pricing;
  sample_count: number;
  successful_test_count: number;
  flagged_test_count: number;
}

export interface RecordingTestMarker {
  test_id: string;
  category: string;
  offset_ms: number;
  prompt_slug: string;
  humanizer_slug: string;
}

export interface RecordingSession {
  id: string;
  started_at: string;
  ended_at: string;
  segment_urls: string[];
  segment_count: number;
  total_duration_ms: number;
  test_markers: RecordingTestMarker[];
}

export interface Cycle {
  cycle: string;
  generated_at: string;
  methodology_version: string;
  scoring_version: string;
  prompt_set_version: string;
  detector_config_version: string;
  humanizer_config_version: string;
  source_model_versions: Record<string, string>;
  cycle_sample_count: number;
  humanizers: Humanizer[];
  recording_sessions?: RecordingSession[];
}

export interface HumanizerHistoryPoint {
  cycle: string;
  composite: number;
  bypass_rate: number;
  detector_breakdown: DetectorBreakdown;
  category_breakdown: CategoryBreakdown;
}

export interface HumanizerHistory {
  slug: string;
  points: HumanizerHistoryPoint[];
}
