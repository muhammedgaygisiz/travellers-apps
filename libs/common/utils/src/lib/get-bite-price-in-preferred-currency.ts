import { getNormalizedPriceInEur } from './get-normalized-price-in-eur';

export const getBitePriceInPreferredCurrency = (
  bite: {
    currency?: string;
    price: number;
  },
  exchangeRates: Record<string, number>,
  preferredCurrency = 'EUR',
): number => {
  const biteCurrency = bite.currency || 'EUR';

  if (biteCurrency === preferredCurrency) {
    return bite.price;
  }

  const normalizedPriceInEur = getNormalizedPriceInEur(
    bite.price,
    biteCurrency,
    exchangeRates[biteCurrency] || 1, // Default to 1 if no rate
  );

  const exchangeRateToPreferredCurrency = exchangeRates[preferredCurrency] || 1; // Default to 1 if no rate
  return +normalizedPriceInEur * exchangeRateToPreferredCurrency;
};
