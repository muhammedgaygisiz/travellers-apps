import { Bite } from 'model';
import { getNormalizedPriceInEur } from 'utils';

const getBitePriceInPreferedCurrency = (
  bite: Bite,
  exchangeRates: Record<string, number>,
  preferedCurrency = 'EUR'
) => {
  const biteCurrency = bite.currency || 'EUR';

  if (biteCurrency === preferedCurrency) {
    return bite.price;
  }

  const normalizedPriceInEur = getNormalizedPriceInEur(
    bite.price,
    biteCurrency,
    exchangeRates[biteCurrency] || 1 // Default to 1 if no rate
  );

  const exchangeRateToPreferedCurrency = exchangeRates[preferedCurrency] || 1; // Default to 1 if no rate
  return +normalizedPriceInEur * exchangeRateToPreferedCurrency;
};

export const handleMaxPriceFilter = (
  maxPriceInPreferedCurrency: number,
  exchangeRates: Record<string, number>,
  bites: Bite[],
  preferedCurrency = 'EUR'
): Bite[] => {
  const hasMaxPriceFilter = maxPriceInPreferedCurrency > 0;

  if (hasMaxPriceFilter) {
    return bites.filter((bite) => {
      const bitePriceInPreferedCurrency = getBitePriceInPreferedCurrency(
        bite,
        exchangeRates,
        preferedCurrency
      );

      return bitePriceInPreferedCurrency <= maxPriceInPreferedCurrency;
    });
  }

  return bites;
};
