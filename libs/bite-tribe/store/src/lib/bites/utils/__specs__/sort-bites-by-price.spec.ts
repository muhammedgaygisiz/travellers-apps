import { sortBitesByPrice } from '../sort-bites-by-price';
import type { Bite } from 'model';

describe('sortBitesByPrice', () => {
  it('should sort bites by price in ascending order', () => {
    const bites = [
      { price: 10, currency: 'USD' } as Bite,
      { price: 5, currency: 'EUR' } as Bite,
      { price: 20, currency: 'USD' } as Bite,
    ];
    const exchangeRates = {
      USD: 0.85, // Example exchange rate
      EUR: 1,
    };

    const sortedBites = sortBitesByPrice(bites, exchangeRates);

    expect(sortedBites[0].price).toBe(5);
    expect(sortedBites[1].price).toBe(10);
    expect(sortedBites[2].price).toBe(20);
  });

  it('should handle bites with the same price', () => {
    const bites = [
      { price: 10, currency: 'USD' } as Bite,
      { price: 10, currency: 'EUR' } as Bite,
    ];
    const exchangeRates = {
      USD: 0.85,
      EUR: 1,
    };

    const sortedBites = sortBitesByPrice(bites, exchangeRates);

    expect(sortedBites[0].price).toBe(10);
    expect(sortedBites[1].price).toBe(10);
  });

  it('should handle bites without currency gracefully ', () => {
    const bites = [
      { price: 10 } as Bite, // No currency
      { price: 5, currency: 'EUR' } as Bite,
      { price: 20, currency: 'USD' } as Bite,
    ];
    const exchangeRates = {
      USD: 0.85,
      EUR: 1,
    };

    const sortedBites = sortBitesByPrice(bites, exchangeRates);

    expect(sortedBites[0].price).toBe(5);
    expect(sortedBites[1].price).toBe(10);
    expect(sortedBites[2].price).toBe(20);
  });

  it('should handle sorting with no exchange rates', () => {
    const bites = [
      { price: 10, currency: 'USD' } as Bite,
      { price: 5, currency: 'EUR' } as Bite,
      { price: 20, currency: 'USD' } as Bite,
    ];
    const exchangeRates = {};

    const sortedBites = sortBitesByPrice(bites, exchangeRates);

    expect(sortedBites[0].price).toBe(5);
    expect(sortedBites[1].price).toBe(10);
    expect(sortedBites[2].price).toBe(20);
  });
});
