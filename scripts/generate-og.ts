/**
 * Build-time OG image generator.
 *
 * Uses Satori to lay out each card, then @resvg/resvg-js to rasterize the
 * SVG to a 1200x630 PNG. Writes results to public/og/ so Astro copies them
 * to dist/og/ during the build.
 *
 * Font loading is robust: Satori only accepts TTF/OTF, so we probe a few
 * known system paths. If no TTF is found, we fall back to a single shared
 * pure-SVG card with no text glyphs (Satori still renders shapes/colors).
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import satori from "satori";
import {
  bestForOg,
  genericOg,
  humanizerOg,
  leaderboardCycleOg,
  ogFileNames,
  vsOg,
} from "../src/lib/og.ts";
import { loadCycle, loadLatestCycle } from "../src/lib/data.ts";
import { listCycles } from "../src/lib/data.ts";
import { DETECTORS } from "../src/lib/detectors.ts";
import {
  listAllVsPairs,
  comparisonSlug,
} from "../src/lib/comparisons.ts";
import { applyUseCaseSort } from "../src/lib/scoring.ts";
import { BEST_FOR_USE_CASES } from "../src/lib/config.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const OG_DIR = path.join(ROOT, "public", "og");

const CANDIDATE_REGULAR_TTF = [
  "/System/Library/Fonts/Supplemental/Arial.ttf",
  "/System/Library/Fonts/Geneva.ttf",
  "/System/Library/Fonts/Monaco.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  "/usr/share/fonts/TTF/DejaVuSans.ttf",
];
const CANDIDATE_BOLD_TTF = [
  "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
  "/System/Library/Fonts/Supplemental/Arial Black.ttf",
  "/System/Library/Fonts/Geneva.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
];
const CANDIDATE_MONO_TTF = [
  "/System/Library/Fonts/Monaco.ttf",
  "/System/Library/Fonts/SFNSMono.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
];

async function findFont(
  candidates: string[],
): Promise<{ data: ArrayBuffer; path: string } | null> {
  for (const p of candidates) {
    try {
      const buf = await fs.readFile(p);
      // Copy into a fresh ArrayBuffer so Satori sees a clean owner.
      const ab = new ArrayBuffer(buf.byteLength);
      new Uint8Array(ab).set(buf);
      return { data: ab, path: p };
    } catch {
      // try next
    }
  }
  return null;
}

interface FontSet {
  regular: ArrayBuffer;
  bold: ArrayBuffer;
  mono: ArrayBuffer;
}

async function loadFonts(): Promise<FontSet | null> {
  const reg = await findFont(CANDIDATE_REGULAR_TTF);
  if (!reg) return null;
  const bold = (await findFont(CANDIDATE_BOLD_TTF)) ?? reg;
  const mono = (await findFont(CANDIDATE_MONO_TTF)) ?? reg;
  console.log(
    `[og] regular: ${reg.path}\n[og] bold:    ${bold.path}\n[og] mono:    ${mono.path}`,
  );
  return { regular: reg.data, bold: bold.data, mono: mono.data };
}

function satoriFontList(fonts: FontSet) {
  return [
    {
      name: "Geist",
      data: fonts.regular,
      weight: 400 as const,
      style: "normal" as const,
    },
    {
      name: "Geist",
      data: fonts.bold,
      weight: 600 as const,
      style: "normal" as const,
    },
    {
      name: "JetBrains Mono",
      data: fonts.mono,
      weight: 500 as const,
      style: "normal" as const,
    },
  ];
}

async function renderNodeToPng(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  node: any,
  fonts: FontSet,
): Promise<Buffer> {
  const svg = await satori(node, {
    width: 1200,
    height: 630,
    fonts: satoriFontList(fonts),
  });
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: 1200 },
    font: { loadSystemFonts: false },
  });
  return Buffer.from(resvg.render().asPng());
}

async function write(name: string, png: Buffer): Promise<void> {
  const file = path.join(OG_DIR, `${name}.png`);
  await fs.writeFile(file, png);
  console.log(`[og] wrote ${path.relative(ROOT, file)} (${png.length} bytes)`);
}

/**
 * Fallback path used when no TTF font is available on the build host.
 * Emits ONE branded PNG with no glyphs (pure shapes), and every page that
 * would have had a custom OG is pointed at this single image.
 */
async function writeFallbackOnly(): Promise<string> {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#09090b"/>
  <rect x="64" y="64" width="120" height="6" fill="#34d399"/>
  <rect x="64" y="540" width="240" height="4" fill="#27272a"/>
  <rect x="540" y="290" width="120" height="50" fill="#18181b" stroke="#34d399" stroke-width="2"/>
</svg>`;
  const resvg = new Resvg(svg);
  const png = Buffer.from(resvg.render().asPng());
  const name = ogFileNames().fallback;
  await write(name, png);
  return name;
}

async function ensureOgDir(): Promise<void> {
  await fs.mkdir(OG_DIR, { recursive: true });
}

async function main() {
  await ensureOgDir();
  const fonts = await loadFonts();

  if (!fonts) {
    console.warn(
      "[og] WARNING: no TTF font available on this host. Writing one fallback PNG; all pages will share it.",
    );
    const fallbackName = await writeFallbackOnly();
    // Also write the standard names so every page's <meta og:image> resolves.
    const cycle = await loadLatestCycle();
    const names = ogFileNames();
    const targets: string[] = [
      names.home,
      names.leaderboard,
      names.leaderboardCycle(cycle.cycle),
      names.humanizers,
      names.detectors,
      names.methodology,
      names.fairness,
      names.about,
      names.blog,
      names.logo,
      names.blogPost("welcome"),
    ];
    for (const h of cycle.humanizers) targets.push(names.humanizer(h.slug));
    for (const slug of Object.keys(DETECTORS)) targets.push(names.detector(slug));
    const vsPairs = await listAllVsPairs();
    for (const pair of vsPairs)
      targets.push(names.vs(comparisonSlug([pair.a, pair.b])));
    for (const uc of BEST_FOR_USE_CASES) targets.push(names.bestFor(uc.slug));
    const fallbackBuf = await fs.readFile(
      path.join(OG_DIR, `${fallbackName}.png`),
    );
    for (const t of targets) {
      if (t === fallbackName) continue;
      await fs.writeFile(path.join(OG_DIR, `${t}.png`), fallbackBuf);
    }
    console.log(`[og] wrote ${targets.length} shared fallback OG images.`);
    return;
  }

  const names = ogFileNames();
  const cycle = await loadLatestCycle();
  const cycles = await listCycles();

  // 1. Logo placeholder (referenced by Organization schema)
  await write(
    names.logo,
    await renderNodeToPng(
      genericOg({ title: "HumanizerBench", subtitle: "Independent benchmark" }),
      fonts,
    ),
  );

  // 2. Home + leaderboard + each historical cycle
  const top5 = cycle.humanizers
    .slice()
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 5)
    .map((h) => ({ name: h.name, composite: h.scores.composite }));
  const leaderboardNode = leaderboardCycleOg({
    cycle: cycle.cycle,
    top5,
  });
  await write(names.home, await renderNodeToPng(leaderboardNode, fonts));
  await write(names.leaderboard, await renderNodeToPng(leaderboardNode, fonts));
  for (const c of cycles) {
    const cyc = c === cycle.cycle ? cycle : await loadLatestCycle();
    const cTop5 = cyc.humanizers
      .slice()
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 5)
      .map((h) => ({ name: h.name, composite: h.scores.composite }));
    const node = leaderboardCycleOg({ cycle: cyc.cycle, top5: cTop5 });
    await write(names.leaderboardCycle(c), await renderNodeToPng(node, fonts));
  }

  // 3. Humanizers index + each humanizer
  await write(
    names.humanizers,
    await renderNodeToPng(
      genericOg({
        title: "AI Humanizers",
        subtitle: `${cycle.humanizers.length} tools tested this cycle`,
      }),
      fonts,
    ),
  );
  for (const h of cycle.humanizers) {
    const node = humanizerOg({
      name: h.name,
      rank: h.rank,
      composite: h.scores.composite,
      cycle: cycle.cycle,
    });
    await write(names.humanizer(h.slug), await renderNodeToPng(node, fonts));
  }

  // 4. Detectors index + each detector
  await write(
    names.detectors,
    await renderNodeToPng(
      genericOg({
        title: "AI Detectors",
        subtitle: "Tested against 6 commercial detectors",
      }),
      fonts,
    ),
  );
  for (const [slug, info] of Object.entries(DETECTORS)) {
    const node = genericOg({
      title: `Best for ${info.name}`,
      subtitle: "Humanizers ranked by bypass rate",
    });
    await write(names.detector(slug), await renderNodeToPng(node, fonts));
  }

  // 5. /vs/ pairs — auto-generated from every cycle's humanizer list, so
  // historical pairs persist even if a humanizer drops out of recent cycles.
  const vsPairs = await listAllVsPairs();
  for (const pair of vsPairs) {
    // Load the cycle where both humanizers coexisted (most recent such cycle).
    const pairCycle =
      pair.cycleId === cycle.cycle
        ? cycle
        : await (async () => {
            try {
              return await loadCycle(pair.cycleId);
            } catch {
              return null;
            }
          })();
    const a = pairCycle?.humanizers.find((h) => h.slug === pair.a);
    const b = pairCycle?.humanizers.find((h) => h.slug === pair.b);
    if (!a || !b) {
      console.warn(
        `[og] skipping vs ${pair.a}-vs-${pair.b} — missing humanizer in cycle ${pair.cycleId}`,
      );
      continue;
    }
    const node = vsOg({
      aName: a.name,
      bName: b.name,
      aScore: a.scores.composite,
      bScore: b.scores.composite,
    });
    await write(
      names.vs(comparisonSlug([pair.a, pair.b])),
      await renderNodeToPng(node, fonts),
    );
  }

  // 6. /best-for/ use cases
  for (const uc of BEST_FOR_USE_CASES) {
    const ranked = applyUseCaseSort(cycle.humanizers, uc.slug);
    const top = ranked[0];
    if (!top) {
      // Empty (e.g. essays-no-signup with no free-tier humanizers) — fall through.
      const node = genericOg({
        title: uc.label,
        subtitle: "Use-case ranking",
      });
      await write(names.bestFor(uc.slug), await renderNodeToPng(node, fonts));
      continue;
    }
    const node = bestForOg({
      useCaseLabel: uc.label,
      topName: top.name,
      topScore: top.scores.composite,
    });
    await write(names.bestFor(uc.slug), await renderNodeToPng(node, fonts));
  }

  // 7. Static content pages
  await write(
    names.methodology,
    await renderNodeToPng(
      genericOg({
        title: "Methodology",
        subtitle: "How HumanizerBench tests AI humanizers",
      }),
      fonts,
    ),
  );
  await write(
    names.fairness,
    await renderNodeToPng(
      genericOg({
        title: "Fairness & Corrections",
        subtitle: "How vendors can dispute results",
      }),
      fonts,
    ),
  );
  await write(
    names.about,
    await renderNodeToPng(
      genericOg({
        title: "About HumanizerBench",
        subtitle: "An independent monthly benchmark",
      }),
      fonts,
    ),
  );
  await write(
    names.why,
    await renderNodeToPng(
      genericOg({
        title: "Why we built this",
        subtitle: "The AI humanizer market deserves auditable data",
      }),
      fonts,
    ),
  );
  await write(
    names.blog,
    await renderNodeToPng(
      genericOg({
        title: "Blog",
        subtitle: "Notes, analysis, and updates",
      }),
      fonts,
    ),
  );
  await write(
    names.blogPost("welcome"),
    await renderNodeToPng(
      genericOg({
        title: "Introducing HumanizerBench",
        subtitle: "An independent monthly benchmark",
      }),
      fonts,
    ),
  );
}

main().catch((err) => {
  console.error("[og] generation failed:", err);
  process.exit(1);
});
