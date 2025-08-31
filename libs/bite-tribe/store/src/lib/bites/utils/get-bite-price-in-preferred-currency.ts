import { Bite } from 'model';
import { getNormalizedPriceInEur } from 'utils';

export const getBitePriceInPreferredCurrency = (
  bite: Bite,
  exchangeRates: Record<string, number>,
  preferredCurrency = 'EUR'
): number => {
  const biteCurrency = bite.currency || 'EUR';

  if (biteCurrency === preferredCurrency) {
    return bite.price;
  }

  const normalizedPriceInEur = getNormalizedPriceInEur(
    bite.price,
    biteCurrency,
    exchangeRates[biteCurrency] || 1 // Default to 1 if no rate
  );

  const exchangeRateToPreferedCurrency = exchangeRates[preferredCurrency] || 1; // Default to 1 if no rate
  return +normalizedPriceInEur * exchangeRateToPreferedCurrency;
};
