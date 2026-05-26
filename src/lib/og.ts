/**
 * Open-graph image templates.
 *
 * Each template returns a Satori-compatible JSX-like tree (`React.ReactNode`,
 * but built without React using plain object literals). Satori interprets the
 * tree as flexbox layout.
 *
 * Templates target a 1200x630 dark card with the HumanizerBench wordmark in
 * one corner and a single emerald accent dot.
 */

import { BRAND_NAME, PARENT_ORG } from "./config";

// We build the JSX tree as plain objects so this module is loadable from
// node scripts without a JSX runtime. Satori only cares about the shape
// { type, props: { children, style, ... } }.
type SatoriNode = {
  type: string;
  props: {
    style?: Record<string, string | number>;
    children?: SatoriNode | SatoriNode[] | string | number | null | undefined;
    [key: string]: unknown;
  };
};

function el(
  type: string,
  style: Record<string, string | number>,
  children:
    | SatoriNode
    | (SatoriNode | string | number | null | undefined)[]
    | string
    | number
    | null
    | undefined = undefined,
): SatoriNode {
  return {
    type,
    props: {
      style,
      children,
    },
  };
}

const COLOR_BG = "#09090b"; // zinc-950
const COLOR_SURFACE = "#18181b"; // zinc-900
const COLOR_BORDER = "#27272a"; // zinc-800
const COLOR_TEXT = "#fafafa"; // zinc-50
const COLOR_MUTED = "#a1a1aa"; // zinc-400
const COLOR_ACCENT = "#818cf8"; // indigo-400

function brandMark(): SatoriNode {
  return el(
    "div",
    {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      fontSize: "22px",
      fontWeight: 600,
      color: COLOR_TEXT,
      letterSpacing: "-0.01em",
    },
    [
      el("div", {
        width: "10px",
        height: "10px",
        borderRadius: "999px",
        background: COLOR_ACCENT,
      }),
      el("div", { display: "flex" }, BRAND_NAME),
    ],
  );
}

function operatorFootnote(): SatoriNode {
  return el(
    "div",
    {
      fontSize: "16px",
      color: COLOR_MUTED,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
    },
    `Operated by ${PARENT_ORG}`,
  );
}

function frame(
  topLeft: SatoriNode,
  body: SatoriNode | SatoriNode[],
  bottomRight: SatoriNode,
): SatoriNode {
  return el(
    "div",
    {
      width: "1200px",
      height: "630px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      padding: "64px",
      background: COLOR_BG,
      fontFamily: "Geist",
      color: COLOR_TEXT,
    },
    [
      el(
        "div",
        {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        },
        [topLeft, operatorFootnote()],
      ),
      el(
        "div",
        {
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          justifyContent: "center",
          marginTop: "24px",
          marginBottom: "24px",
        },
        Array.isArray(body) ? body : [body],
      ),
      el(
        "div",
        {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
        },
        [
          el(
            "div",
            {
              display: "flex",
              fontSize: "16px",
              color: COLOR_MUTED,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            },
            "humanizerbench.example.com",
          ),
          bottomRight,
        ],
      ),
    ],
  );
}

function headline(text: string, size = 88): SatoriNode {
  return el(
    "div",
    {
      display: "flex",
      fontSize: `${size}px`,
      lineHeight: 1.04,
      fontWeight: 600,
      color: COLOR_TEXT,
      letterSpacing: "-0.025em",
    },
    text,
  );
}

function subhead(text: string): SatoriNode {
  return el(
    "div",
    {
      display: "flex",
      marginTop: "24px",
      fontSize: "28px",
      color: COLOR_MUTED,
      letterSpacing: "-0.01em",
    },
    text,
  );
}

function fmtPct(n: number): string {
  return `${(n * 100).toFixed(1)}`;
}

export interface LeaderboardCycleOgProps {
  cycle: string;
  top5: Array<{ name: string; composite: number }>;
}

export function leaderboardCycleOg(
  props: LeaderboardCycleOgProps,
): SatoriNode {
  const rows = props.top5.slice(0, 5).map((h, i) =>
    el(
      "div",
      {
        display: "flex",
        alignItems: "center",
        gap: "16px",
        padding: "10px 0",
        fontSize: "26px",
        color: COLOR_TEXT,
      },
      [
        el(
          "div",
          {
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            width: "40px",
            height: "40px",
            borderRadius: "999px",
            border: `1px solid ${COLOR_BORDER}`,
            background: COLOR_SURFACE,
            color: COLOR_MUTED,
            fontSize: "18px",
            fontWeight: 600,
          },
          `${i + 1}`,
        ),
        el(
          "div",
          {
            display: "flex",
            flexGrow: 1,
            color: COLOR_TEXT,
            fontWeight: 500,
          },
          h.name,
        ),
        el(
          "div",
          {
            display: "flex",
            color: COLOR_ACCENT,
            fontWeight: 600,
            fontFamily: "JetBrains Mono",
          },
          fmtPct(h.composite),
        ),
      ],
    ),
  );

  const body = el(
    "div",
    {
      display: "flex",
      flexDirection: "row",
      width: "100%",
      gap: "48px",
      alignItems: "flex-start",
    },
    [
      el(
        "div",
        {
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          gap: "10px",
        },
        [
          headline("Best AI", 96),
          headline("Humanizer", 96),
          headline("Leaderboard", 96),
          subhead(`Cycle ${props.cycle}`),
        ],
      ),
      el(
        "div",
        {
          display: "flex",
          flexDirection: "column",
          width: "480px",
          padding: "24px 28px",
          border: `1px solid ${COLOR_BORDER}`,
          borderRadius: "16px",
          background: COLOR_SURFACE,
        },
        rows,
      ),
    ],
  );

  return frame(
    brandMark(),
    body,
    el(
      "div",
      {
        display: "flex",
        color: COLOR_ACCENT,
        fontSize: "16px",
        letterSpacing: "0.04em",
        textTransform: "uppercase",
      },
      "Independent benchmark",
    ),
  );
}

export interface HumanizerOgProps {
  name: string;
  rank: number;
  composite: number;
  cycle: string;
}

export function humanizerOg(props: HumanizerOgProps): SatoriNode {
  const body = el(
    "div",
    { display: "flex", flexDirection: "column", gap: "10px" },
    [
      el(
        "div",
        {
          display: "flex",
          fontSize: "22px",
          color: COLOR_MUTED,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        },
        `Cycle ${props.cycle} · Rank #${props.rank}`,
      ),
      headline(props.name, 108),
      el(
        "div",
        {
          display: "flex",
          alignItems: "baseline",
          gap: "16px",
          marginTop: "28px",
        },
        [
          el(
            "div",
            {
              display: "flex",
              fontSize: "120px",
              fontFamily: "JetBrains Mono",
              color: COLOR_ACCENT,
              fontWeight: 600,
              letterSpacing: "-0.04em",
              lineHeight: 1,
            },
            fmtPct(props.composite),
          ),
          el(
            "div",
            {
              display: "flex",
              fontSize: "26px",
              color: COLOR_MUTED,
            },
            "composite",
          ),
        ],
      ),
    ],
  );

  return frame(
    brandMark(),
    body,
    el(
      "div",
      {
        display: "flex",
        color: COLOR_MUTED,
        fontSize: "16px",
        letterSpacing: "0.04em",
        textTransform: "uppercase",
      },
      "Humanizer review",
    ),
  );
}

export interface VsOgProps {
  aName: string;
  bName: string;
  aScore: number;
  bScore: number;
}

export function vsOg(props: VsOgProps): SatoriNode {
  const aWins = props.aScore > props.bScore;

  function sideCard(
    name: string,
    score: number,
    isWinner: boolean,
  ): SatoriNode {
    return el(
      "div",
      {
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        flexGrow: 1,
        flexBasis: 0,
        padding: "32px",
        borderRadius: "20px",
        border: `1px solid ${isWinner ? COLOR_ACCENT : COLOR_BORDER}`,
        background: COLOR_SURFACE,
      },
      [
        el(
          "div",
          {
            display: "flex",
            fontSize: "44px",
            fontWeight: 600,
            color: COLOR_TEXT,
            letterSpacing: "-0.02em",
          },
          name,
        ),
        el(
          "div",
          {
            display: "flex",
            alignItems: "baseline",
            gap: "12px",
          },
          [
            el(
              "div",
              {
                display: "flex",
                fontFamily: "JetBrains Mono",
                fontSize: "84px",
                color: isWinner ? COLOR_ACCENT : COLOR_TEXT,
                fontWeight: 600,
                letterSpacing: "-0.04em",
                lineHeight: 1,
              },
              fmtPct(score),
            ),
            el(
              "div",
              { display: "flex", fontSize: "22px", color: COLOR_MUTED },
              "composite",
            ),
          ],
        ),
      ],
    );
  }

  const body = el(
    "div",
    { display: "flex", flexDirection: "column", gap: "24px" },
    [
      el(
        "div",
        {
          display: "flex",
          fontSize: "22px",
          color: COLOR_MUTED,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        },
        "Head to head",
      ),
      el(
        "div",
        { display: "flex", flexDirection: "row", gap: "24px", alignItems: "stretch" },
        [
          sideCard(props.aName, props.aScore, aWins),
          el(
            "div",
            {
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "60px",
              color: COLOR_MUTED,
              fontSize: "30px",
              fontWeight: 500,
            },
            "vs",
          ),
          sideCard(props.bName, props.bScore, !aWins),
        ],
      ),
    ],
  );

  return frame(
    brandMark(),
    body,
    el(
      "div",
      {
        display: "flex",
        color: COLOR_MUTED,
        fontSize: "16px",
        letterSpacing: "0.04em",
        textTransform: "uppercase",
      },
      "Comparison",
    ),
  );
}

export interface BestForOgProps {
  useCaseLabel: string;
  topName: string;
  topScore: number;
}

export function bestForOg(props: BestForOgProps): SatoriNode {
  const body = el(
    "div",
    { display: "flex", flexDirection: "column", gap: "16px" },
    [
      el(
        "div",
        {
          display: "flex",
          fontSize: "22px",
          color: COLOR_MUTED,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        },
        "Use-case ranking",
      ),
      headline(props.useCaseLabel, 78),
      el(
        "div",
        {
          display: "flex",
          flexDirection: "column",
          marginTop: "24px",
          padding: "24px 28px",
          border: `1px solid ${COLOR_BORDER}`,
          borderRadius: "16px",
          background: COLOR_SURFACE,
          gap: "8px",
        },
        [
          el(
            "div",
            {
              display: "flex",
              fontSize: "18px",
              color: COLOR_MUTED,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            },
            "Number 1",
          ),
          el(
            "div",
            { display: "flex", alignItems: "baseline", gap: "16px" },
            [
              el(
                "div",
                {
                  display: "flex",
                  fontSize: "60px",
                  color: COLOR_TEXT,
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                },
                props.topName,
              ),
              el(
                "div",
                {
                  display: "flex",
                  fontFamily: "JetBrains Mono",
                  fontSize: "60px",
                  color: COLOR_ACCENT,
                  fontWeight: 600,
                  letterSpacing: "-0.04em",
                },
                fmtPct(props.topScore),
              ),
            ],
          ),
        ],
      ),
    ],
  );

  return frame(
    brandMark(),
    body,
    el(
      "div",
      {
        display: "flex",
        color: COLOR_ACCENT,
        fontSize: "16px",
        letterSpacing: "0.04em",
        textTransform: "uppercase",
      },
      "Best for",
    ),
  );
}

export interface GenericOgProps {
  title: string;
  subtitle?: string;
}

export function genericOg(props: GenericOgProps): SatoriNode {
  const body = el(
    "div",
    { display: "flex", flexDirection: "column", gap: "16px" },
    [
      headline(props.title, props.title.length > 32 ? 80 : 104),
      ...(props.subtitle ? [subhead(props.subtitle)] : []),
    ],
  );

  return frame(
    brandMark(),
    body,
    el(
      "div",
      {
        display: "flex",
        color: COLOR_MUTED,
        fontSize: "16px",
        letterSpacing: "0.04em",
        textTransform: "uppercase",
      },
      "Independent benchmark",
    ),
  );
}

/**
 * Stable slug helpers so the script and the page meta tags agree.
 */
export function ogFileNames() {
  return {
    home: "home",
    leaderboard: "leaderboard",
    leaderboardCycle: (cycle: string) => `leaderboard-${cycle}`,
    humanizers: "humanizers",
    humanizer: (slug: string) => `humanizer-${slug}`,
    detectors: "detectors",
    detector: (slug: string) => `detector-${slug}`,
    vs: (slug: string) => `vs-${slug}`,
    bestFor: (slug: string) => `best-for-${slug}`,
    methodology: "methodology",
    fairness: "fairness",
    about: "about",
    why: "why",
    blog: "blog",
    blogPost: (slug: string) => `blog-${slug}`,
    logo: "logo",
    fallback: "default",
  } as const;
}
