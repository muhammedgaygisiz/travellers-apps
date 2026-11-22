/**
 * An amount of money, written the way the reader's language writes money
 * (GitHub issue #2261).
 *
 * One function for every price a guest reads on a menu, in the cart and on the
 * bill, so a dish at "5,90 €" never adds up to a cart that says "5.9 €".
 * `Intl.NumberFormat` supplies what a template interpolation cannot: the
 * currency's minor-unit decimals (two for EUR, none for JPY), the language's
 * decimal separator, and where the symbol goes.
 *
 * - **No currency** keeps the bare number, in the language's separators. A
 *   menu that states no currency must not gain a guessed symbol (#1102).
 * - **A code `Intl` refuses** - malformed, not merely unfamiliar - falls back
 *   to the amount and the code, which is still something a guest can ask about.
 * - **An unknown language** falls back to the runtime's default rather than
 *   throwing in the middle of a menu.
 */
export const formatMoney = (
  amount: number,
  currency: string | undefined,
  lang: string,
): string => {
  const locale = supportedLocale(lang);

  if (!currency) {
    return new Intl.NumberFormat(locale).format(amount);
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(amount);
  } catch {
    return `${new Intl.NumberFormat(locale).format(amount)} ${currency}`;
  }
};

const supportedLocale = (lang: string): string | undefined => {
  try {
    return Intl.NumberFormat.supportedLocalesOf(lang)[0];
  } catch {
    return undefined;
  }
};
