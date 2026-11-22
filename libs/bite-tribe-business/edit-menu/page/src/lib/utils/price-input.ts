import type {
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { currencyCodes } from 'utils';

/**
 * Prices as the menu editor's fields show and read them (GitHub issue #2279).
 *
 * Every price field - a dish, a variant, an extra - shows the price with the
 * currency's own number of decimals and a point, so 11.5 reads "11.50" in
 * every field and in the list beside it. Before, a dish's field was a browser
 * number input given the raw number, which a German Chrome wrote "11,5", next
 * to an extra's "2.20".
 *
 * Reading is forgiving: "11,50", "11.50" and "11.5" are all 11.5, because an
 * owner types the separator their keyboard has.
 */

/** Decimals for a currency code; two when the code is unknown or unset. */
export const priceDecimals = (currency?: string | null): number =>
  currencyCodes.find(({ code }) => code === currency)?.decimal_digits ?? 2;

/** The text a price field shows for a stored price. Empty for none. */
export const formatPriceInput = (
  price: number | null | undefined,
  currency?: string | null,
): string =>
  typeof price === 'number' && Number.isFinite(price)
    ? price.toFixed(priceDecimals(currency))
    : '';

/**
 * The price a field holds, or `null` when it holds none.
 *
 * Takes a number as well as text, so a form control patched with a number
 * reads the same as one an owner typed into. Where both separators appear, the
 * last one is the decimal separator and the others group thousands: "1.234,50"
 * and "1,234.50" are both 1234.5.
 */
export const parsePriceInput = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const text = value.replace(/\s/g, '');

  if (!text) {
    return null;
  }

  const decimalAt = Math.max(text.lastIndexOf(','), text.lastIndexOf('.'));
  const normalised =
    decimalAt < 0
      ? text
      : `${text.slice(0, decimalAt).replace(/[.,]/g, '')}.${text.slice(decimalAt + 1)}`;

  if (!/^-?\d*\.?\d+$/.test(normalised)) {
    return null;
  }

  const price = Number(normalised);

  return Number.isFinite(price) ? price : null;
};

/**
 * Requires a price of at least `min` in a field read by
 * {@link parsePriceInput}. Replaces `required` and `min` on a text price field,
 * which compare the text rather than the price.
 */
export const priceValidator =
  (min: number): ValidatorFn =>
  (control: AbstractControl): ValidationErrors | null => {
    const price = parsePriceInput(control.value);

    if (price === null) {
      return { required: true };
    }

    return price < min ? { min: { min, actual: price } } : null;
  };
