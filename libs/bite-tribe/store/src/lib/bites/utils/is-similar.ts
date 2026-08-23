import { getSimilarityScore, normalize } from 'utils';

/**
 * Restaurant names repeat heavily, both inside a single dedup pass and across
 * the recomputes that follow every store change, and each miss costs a freshly
 * built fuzzy index. Caching the verdicts turns the second and later passes
 * over the same feed into lookups. See GitHub issue #1357.
 *
 * The caches are cleared wholesale once they outgrow what a feed could
 * legitimately need, so a long session cannot leak.
 */
const MAX_CACHE_ENTRIES = 20_000;

const normalized = new Map<string, string>();
const verdicts = new Map<string, Map<string, boolean>>();

const normalizeOnce = (name: string): string => {
  const cached = normalized.get(name);

  if (cached !== undefined) {
    return cached;
  }

  if (normalized.size >= MAX_CACHE_ENTRIES) {
    normalized.clear();
  }

  const result = normalize(name);
  normalized.set(name, result);

  return result;
};

export const isSimilar = (name1: string, name2: string): boolean => {
  const normalizedName1 = normalizeOnce(name1);
  const normalizedName2 = normalizeOnce(name2);

  // The comparison is symmetric, so one ordering answers both directions.
  const [first, second] =
    normalizedName1 < normalizedName2
      ? [normalizedName1, normalizedName2]
      : [normalizedName2, normalizedName1];

  const cached = verdicts.get(first)?.get(second);

  if (cached !== undefined) {
    return cached;
  }

  const similarityScore = getSimilarityScore(normalizedName1, normalizedName2);
  const verdict = similarityScore.length > 0 && similarityScore[0].score >= 0.8;

  if (verdicts.size >= MAX_CACHE_ENTRIES) {
    verdicts.clear();
  }

  const row = verdicts.get(first) ?? new Map<string, boolean>();
  row.set(second, verdict);
  verdicts.set(first, row);

  return verdict;
};
