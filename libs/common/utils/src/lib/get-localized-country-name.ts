/**
 * Resolves the country name in the user's language. Country names are not kept
 * in the Transloco catalogs: `Intl.DisplayNames` already ships CLDR names for
 * every supported language, so translating 244 countries by hand would only
 * add drift.
 */
export function getLocalizedCountryName(
  countryCode: string,
  lang: string | undefined,
  fallbackName?: string,
): string {
  if (!lang) {
    return fallbackName || countryCode;
  }

  try {
    const regionDisplayNames = new Intl.DisplayNames([lang], {
      type: 'region',
    });

    return regionDisplayNames.of(countryCode) || fallbackName || countryCode;
  } catch {
    return fallbackName || countryCode;
  }
}
