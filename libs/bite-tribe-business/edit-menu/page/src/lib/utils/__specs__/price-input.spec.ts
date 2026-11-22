import { FormControl } from '@angular/forms';
import {
  formatPriceInput,
  parsePriceInput,
  priceDecimals,
  priceValidator,
} from '../price-input';

/** Prices in the menu editor's fields (GitHub issue #2279). */
describe('price input', () => {
  describe('formatPriceInput', () => {
    it("shows the currency's decimals with a point", () => {
      expect(formatPriceInput(11.5, 'EUR')).toBe('11.50');
      expect(formatPriceInput(2.2, 'CHF')).toBe('2.20');
    });

    it('shows no decimals for a currency without minor units', () => {
      expect(priceDecimals('JPY')).toBe(0);
      expect(formatPriceInput(1200, 'JPY')).toBe('1200');
    });

    it('falls back to two decimals without a currency', () => {
      expect(formatPriceInput(9, undefined)).toBe('9.00');
    });

    it('shows nothing for no price', () => {
      expect(formatPriceInput(null, 'EUR')).toBe('');
      expect(formatPriceInput(undefined, 'EUR')).toBe('');
      expect(formatPriceInput(Number.NaN, 'EUR')).toBe('');
    });
  });

  describe('parsePriceInput', () => {
    it.each([
      ['11,50', 11.5],
      ['11.50', 11.5],
      ['11.5', 11.5],
      [' 11 ', 11],
      ['1.234,50', 1234.5],
      ['1,234.50', 1234.5],
      [11.5, 11.5],
    ])('reads %p as %p', (value, price) => {
      expect(parsePriceInput(value)).toBe(price);
    });

    it.each(['', '  ', 'abc', '1,2,3x', null, undefined, Number.NaN])(
      'reads %p as no price',
      (value) => {
        expect(parsePriceInput(value)).toBeNull();
      },
    );
  });

  describe('priceValidator', () => {
    const validate = (value: unknown): unknown =>
      priceValidator(0.01)(new FormControl(value));

    it('accepts a price above the minimum, typed either way', () => {
      expect(validate('11,50')).toBeNull();
      expect(validate(11.5)).toBeNull();
    });

    it('requires a price', () => {
      expect(validate('')).toEqual({ required: true });
      expect(validate('abc')).toEqual({ required: true });
    });

    it('refuses a price below the minimum', () => {
      expect(validate('0')).toEqual({ min: { min: 0.01, actual: 0 } });
    });
  });
});
