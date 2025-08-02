import { handleMaxPriceFilter } from '../handle-max-price-filter';
import { Bite } from 'model';

describe('handleMaxPriceFilter', () => {
  const exchangeRates = {
    EUR: 1,
    USD: 1.2,
    GBP: 0.9,
  };

  it('should filter bites by max price in preferred currency', () => {
    const bites = [
      { price: 100, currency: 'EUR' } as Bite,
      { price: 121, currency: 'USD' } as Bite,
      { price: 100, currency: 'GBP' } as Bite,
    ];

    const result = handleMaxPriceFilter(100, exchangeRates, bites, 'EUR');

    expect(result).toEqual([{ price: 100, currency: 'EUR' }]);
  });

  it('should return all bites if max price is not set', () => {
    const bites = [
      { price: 100, currency: 'EUR' } as Bite,
      { price: 100, currency: 'USD' } as Bite,
      { price: 90, currency: 'GBP' } as Bite,
    ];

    const result = handleMaxPriceFilter(0, exchangeRates, bites, 'EUR');
    expect(result).toEqual(bites);
  });

  it('should handle different currencies correctly', () => {
    const bites = [
      { price: 100, currency: 'EUR' } as Bite,
      { price: 120, currency: 'USD' } as Bite, // 120 USD -> 100 EUR
      { price: 90, currency: 'GBP' } as Bite, // 90 GBP -> 100 EUR
    ];

    const result = handleMaxPriceFilter(110, exchangeRates, bites, 'EUR');
    expect(result).toEqual([
      { price: 100, currency: 'EUR' },
      { price: 120, currency: 'USD' }, // within limit after conversion
      { price: 90, currency: 'GBP' }, // within limit after conversion
    ]);
  });

  it('should handle if no preferred currency is provided', () => {
    const bites = [
      { price: 100, currency: 'EUR' } as Bite,
      { price: 121, currency: 'USD' } as Bite,
      { price: 100, currency: 'GBP' } as Bite,
    ];

    const result = handleMaxPriceFilter(100, exchangeRates, bites);

    expect(result).toEqual([{ price: 100, currency: 'EUR' }]);
  });
});
