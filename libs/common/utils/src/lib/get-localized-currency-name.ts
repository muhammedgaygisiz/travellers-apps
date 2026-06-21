export function getLocalizedCurrencyName(
  currencyCode: string,
  lang: string | undefined,
  fallbackName?: string,
): string {
  if (!lang) {
    return fallbackName || currencyCode;
  }

  try {
    const currencyDisplayNames = new Intl.DisplayNames([lang], {
      type: 'currency',
    });
    return (
      currencyDisplayNames.of(currencyCode) || fallbackName || currencyCode
    );
  } catch {
    return fallbackName || currencyCode;
  }
}
