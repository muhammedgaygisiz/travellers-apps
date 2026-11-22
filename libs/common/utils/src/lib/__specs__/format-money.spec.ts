import { formatMoney } from '../format-money';

/** Intl separates a currency from its amount with a no-break space. */
const plain = (text: string): string => text.replace(/\s/g, ' ');

describe('formatMoney (#2261)', () => {
  it('writes the minor-unit decimals a price stored as 5.9 dropped', () => {
    expect(plain(formatMoney(5.9, 'EUR', 'en'))).toBe('€5.90');
    expect(plain(formatMoney(5.9, 'EUR', 'de'))).toBe('5,90 €');
  });

  it('writes the decimals of a whole price', () => {
    expect(plain(formatMoney(5, 'EUR', 'de'))).toBe('5,00 €');
  });

  it('writes no decimals for a currency without minor units', () => {
    expect(plain(formatMoney(1200, 'JPY', 'en'))).toBe('¥1,200');
  });

  it('keeps the bare number where the menu states no currency', () => {
    expect(formatMoney(2, undefined, 'en')).toBe('2');
    expect(formatMoney(5.9, '', 'de')).toBe('5,9');
  });

  it('falls back to the amount and the code for a code Intl refuses', () => {
    expect(formatMoney(5.9, 'EURO', 'en')).toBe('5.9 EURO');
  });

  it('does not throw for a language Intl does not know', () => {
    expect(() => formatMoney(5.9, 'EUR', 'not a tag!')).not.toThrow();
  });
});
