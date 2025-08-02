export const getNormalizedPriceInEur = (
  price: number,
  currency: string,
  exchangeRateToEur: number
) => {
  if (currency === 'EUR') {
    return price;
  }

  if (currency && price) {
    const rate = exchangeRateToEur || 1; // Default to 1 if no rate found

    return price / rate;
  }

  return 0;
};
