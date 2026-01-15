import type { Bite } from 'model';
import { getBitePriceInPreferredCurrency } from './get-bite-price-in-preferred-currency';

export const enrichByPriceInPreferredCurrency = (
  bite: Bite | undefined,
  exchangeRates: Record<string, number>,
  preferedCurrency: string,
): Bite | undefined => {
  if (!bite) {
    return undefined;
  }

  return {
    ...bite,
    priceInPreferredCurrency: getBitePriceInPreferredCurrency(
      bite,
      exchangeRates,
      preferedCurrency,
    ),
    priceInPreferredCurrencySymbol: preferedCurrency,
  };
};
