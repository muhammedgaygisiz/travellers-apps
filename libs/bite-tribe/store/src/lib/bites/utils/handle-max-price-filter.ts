import { Bite } from 'model';
import { getBitePriceInPreferredCurrency } from './get-bite-price-in-preferred-currency';

export const handleMaxPriceFilter = (
  maxPriceInPreferedCurrency: number,
  exchangeRates: Record<string, number>,
  bites: Bite[],
  preferedCurrency = 'EUR'
): Bite[] => {
  const hasMaxPriceFilter = maxPriceInPreferedCurrency > 0;

  if (hasMaxPriceFilter) {
    return bites.filter((bite) => {
      const bitePriceInPreferedCurrency = getBitePriceInPreferredCurrency(
        bite,
        exchangeRates,
        preferedCurrency
      );

      return bitePriceInPreferedCurrency <= maxPriceInPreferedCurrency;
    });
  }

  return bites;
};
