import type { Bite } from 'model';

/**
 * How many Bites a user has per country, keyed by alpha-2 code (GitHub issue
 * #1787).
 *
 * Normalised the way the backend normalises the codes it writes onto the
 * profile (`user-country-codes.ts`), so a count lines up with the flag it
 * belongs to. A Bite whose address has not been resolved yet has no country
 * and is not counted anywhere.
 */
export const countBitesByCountry = (
  bites: readonly Pick<Bite, 'countryCode'>[],
): Record<string, number> => {
  const counts: Record<string, number> = {};

  for (const bite of bites) {
    const code =
      typeof bite.countryCode === 'string'
        ? bite.countryCode.trim().toUpperCase()
        : '';

    if (code) {
      counts[code] = (counts[code] ?? 0) + 1;
    }
  }

  return counts;
};
