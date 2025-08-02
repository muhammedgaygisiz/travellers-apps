import { Bite } from 'model';
import { getNormalizedPriceInEur } from 'utils';

export const sortBitesByPrice = (
  bites: Bite[],
  exchangeRates: Record<string, number>
) => {
  return bites.sort((a: Bite, b: Bite) => {
    return (
      getNormalizedPriceInEur(
        a.price,
        a.currency || 'EUR',
        exchangeRates[a.currency || 'EUR']
      ) -
      getNormalizedPriceInEur(
        b.price,
        b.currency || 'EUR',
        exchangeRates[b.currency || 'EUR']
      )
    );
  });
};
