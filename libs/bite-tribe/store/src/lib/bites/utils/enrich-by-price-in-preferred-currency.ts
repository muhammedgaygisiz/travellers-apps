import type { Bite } from 'model';
import { getBitePriceInPreferredCurrency } from 'utils';

export const enrichByPriceInPreferredCurrency = (
  bite: Bite | undefined,
  exchangeRates: Record<string, number>,
  preferredCurrency: string,
): Bite | undefined => {
  if (!bite) {
    return undefined;
  }

  return {
    ...bite,
    priceInPreferredCurrency: getBitePriceInPreferredCurrency(
      bite,
      exchangeRates,
      preferredCurrency,
    ),
    priceInPreferredCurrencySymbol: preferredCurrency,
  };
};
