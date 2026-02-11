import type { Bite } from 'model';
import { getBitePriceInPreferredCurrency } from 'utils';

export const handleMaxPriceFilter = (
  maxPriceInPreferedCurrency: number,
  exchangeRates: Record<string, number>,
  bites: Bite[],
  preferredCurrency = 'EUR',
): Bite[] => {
  const hasMaxPriceFilter = maxPriceInPreferedCurrency > 0;

  if (hasMaxPriceFilter) {
    return bites.filter((bite) => {
      const bitePriceInPreferredCurrency = getBitePriceInPreferredCurrency(
        bite,
        exchangeRates,
        preferredCurrency,
      );

      return bitePriceInPreferredCurrency <= maxPriceInPreferedCurrency;
    });
  }

  return bites;
};
