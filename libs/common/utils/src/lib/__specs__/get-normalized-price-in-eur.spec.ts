import { getNormalizedPriceInEur } from '../get-normalized-price-in-eur';

describe('getNormalizedPriceInEur', () => {
  it('should return the price in EUR if currency is EUR', () => {
    const price = 100;
    const currency = 'EUR';
    const exchangeRateToEur = 1;

    const result = getNormalizedPriceInEur(price, currency, exchangeRateToEur);

    expect(result).toBe(100);
  });

  it('should convert price from USD to EUR using exchange rate', () => {
    const price = 100;
    const currency = 'USD';
    const exchangeRateToEur = 0.85; // Example exchange rate

    const result = getNormalizedPriceInEur(price, currency, exchangeRateToEur);

    expect(result).toBeCloseTo(117.65, 2); // 100 / 0.85
  });

  it('should return 0 if price is not provided', () => {
    const price = 0;
    const currency = 'USD';
    const exchangeRateToEur = 0.85;

    const result = getNormalizedPriceInEur(price, currency, exchangeRateToEur);

    expect(result).toBe(0);
  });

  it('should return 0 if currency is not provided', () => {
    const price = 100;
    const currency = '';
    const exchangeRateToEur = 1;

    const result = getNormalizedPriceInEur(price, currency, exchangeRateToEur);

    expect(result).toBe(0);
  });
});
