import { getBitePriceInPreferredCurrency } from '../get-bite-price-in-preferred-currency';

describe('getBitePriceInPreferredCurrency', () => {
  it('should return the price in the preferred currency if the bite currency matches', () => {
    const bite = { price: 100, currency: 'USD' };
    const exchangeRates = { USD: 1, EUR: 0.85 };
    const preferredCurrency = 'USD';

    const price = getBitePriceInPreferredCurrency(
      bite,
      exchangeRates,
      preferredCurrency,
    );
    expect(price).toBe(100);
  });

  it('should convert the price to the preferred currency if the bite currency does not match', () => {
    const bite = { price: 100, currency: 'USD' };
    const exchangeRates = { USD: 1, EUR: 0.85 };
    const preferredCurrency = 'EUR';

    const price = getBitePriceInPreferredCurrency(
      bite,
      exchangeRates,
      preferredCurrency,
    );
    expect(price).toBeCloseTo(85); // 100 * 0.85
  });

  it('should handle cases where the exchange rate for the bite currency is not available', () => {
    const bite = { price: 100, currency: 'GBP' }; // GBP has no rate
    const exchangeRates = { USD: 1, EUR: 0.85 };
    const preferredCurrency = 'EUR';

    const price = getBitePriceInPreferredCurrency(
      bite,
      exchangeRates,
      preferredCurrency,
    );
    expect(price).toBeCloseTo(85); // Default to 1 if no rate
  });

  it('should return the price in EUR if no preferred currency is specified', () => {
    const bite = { price: 100, currency: 'USD' };
    const exchangeRates = { USD: 1, EUR: 0.85 };

    const price = getBitePriceInPreferredCurrency(bite, exchangeRates);
    expect(price).toBeCloseTo(85); // Default to EUR
  });

  it('should return use EUR exchange rate (1) if exchange rate is unknown', () => {
    const bite = { price: 100, currency: 'GBP' }; // GBP has no rate
    const exchangeRates = { USD: 1, EUR: 0.85 };

    const price = getBitePriceInPreferredCurrency(bite, exchangeRates);
    expect(price).toBeCloseTo(85); // Default to 1 if no rate
  });
});
