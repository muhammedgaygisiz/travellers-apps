import { Bite } from 'model';

const getNormalizedPrice = (
  bite: Bite,
  exchangeRates: Record<string, number>
) => {
  if (bite.currency && bite.price) {
    const rate = exchangeRates[bite.currency] || 1; // Default to 1 if no rate found
    const price = bite.price;

    return price / rate;
  }

  return 0; // Return 0 if no price or currency is defined
};

export const sortBitesByPrice = (
  bites: Bite[],
  exchangeRates: Record<string, number>
) => {
  console.log(
    'TODO: implement sorting by prices after finished exchange rates',
    exchangeRates
  );

  return bites.sort((a: Bite, b: Bite) => {
    return (
      getNormalizedPrice(a, exchangeRates) -
      getNormalizedPrice(b, exchangeRates)
    );
  });
};
