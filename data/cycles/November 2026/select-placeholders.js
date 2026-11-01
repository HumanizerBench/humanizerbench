// Frozen at cycle close. Re-run by benchmarkPublic/scripts/verify-cycle.ts.
// Pure ESM, no dependencies. Inputs are loaded from sibling JSON files.

function djb2(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (h * 33) ^ s.charCodeAt(i);
  }
  return h >>> 0;
}

const PLACEHOLDER_RE = /\[([A-Z][A-Z_]*)\]/g;

function extractPlaceholders(text) {
  const set = new Set();
  for (const m of text.matchAll(PLACEHOLDER_RE)) set.add(m[1]);
  return Array.from(set);
}

export function selectPlaceholdersForCycle(nonce, prompts, banks) {
  const result = {};
  for (const p of prompts) {
    const tokens = extractPlaceholders(p.prompt_text);
    if (tokens.length === 0) continue;
    const perPrompt = {};
    for (const token of tokens) {
      const bank = banks[token];
      if (!bank || bank.length === 0) continue;
      const idx = djb2(`${nonce}|${p.slug}|${token}`) % bank.length;
      perPrompt[token] = bank[idx];
    }
    if (Object.keys(perPrompt).length > 0) {
      result[p.slug] = perPrompt;
    }
  }
  return result;
}

export function substitutePlaceholders(text, values) {
  const missing = new Set();
  const out = text.replace(PLACEHOLDER_RE, (_, key) => {
    const v = values[key];
    if (v == null || v === "") {
      missing.add(key);
      return `[${key}]`;
    }
    return v;
  });
  return { text: out, missing: Array.from(missing).sort() };
}
