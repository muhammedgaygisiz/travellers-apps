import { currencyCodes } from './currencies';

const FALLBACK_CURRENCY = 'EUR';

/**
 * Region subtag to currency code. There is no Intl API that maps a region to
 * its currency, so the mapping is explicit. It covers the regions BiteTribe
 * ships languages for plus the common travel destinations; anything unmapped
 * falls back to {@link FALLBACK_CURRENCY}.
 */
const CURRENCY_BY_REGION: Readonly<Record<string, string>> = {
  AE: 'AED',
  AR: 'ARS',
  AT: 'EUR',
  AU: 'AUD',
  BE: 'EUR',
  BR: 'BRL',
  CA: 'CAD',
  CH: 'CHF',
  CL: 'CLP',
  CN: 'CNY',
  CO: 'COP',
  CZ: 'CZK',
  DE: 'EUR',
  DK: 'DKK',
  EG: 'EGP',
  ES: 'EUR',
  ET: 'ETB',
  FI: 'EUR',
  FR: 'EUR',
  GB: 'GBP',
  GR: 'EUR',
  HK: 'HKD',
  HU: 'HUF',
  ID: 'IDR',
  IE: 'EUR',
  IL: 'ILS',
  IN: 'INR',
  IT: 'EUR',
  JP: 'JPY',
  KR: 'KRW',
  MA: 'MAD',
  MX: 'MXN',
  MY: 'MYR',
  NG: 'NGN',
  NL: 'EUR',
  NO: 'NOK',
  NZ: 'NZD',
  PE: 'PEN',
  PH: 'PHP',
  PK: 'PKR',
  PL: 'PLN',
  PT: 'EUR',
  RO: 'RON',
  RS: 'RSD',
  RU: 'RUB',
  SA: 'SAR',
  SE: 'SEK',
  SG: 'SGD',
  TH: 'THB',
  TR: 'TRY',
  TW: 'TWD',
  UA: 'UAH',
  US: 'USD',
  VN: 'VND',
  ZA: 'ZAR',
};

/** Region used when a locale carries only a language, e.g. `de` or `pt`. */
const REGION_BY_LANGUAGE: Readonly<Record<string, string>> = {
  am: 'ET',
  ar: 'AE',
  de: 'DE',
  en: 'US',
  es: 'ES',
  fr: 'FR',
  id: 'ID',
  it: 'IT',
  pt: 'PT',
  th: 'TH',
  tr: 'TR',
};

const isSupportedCurrency = (code: string): boolean =>
  currencyCodes.some((currency) => currency.code === code);

/**
 * Best-effort default currency for a device locale, e.g. `de-AT` -> `EUR`.
 *
 * Used to prefill the onboarding currency step. The result is only a
 * suggestion: the user confirms or changes it before it is persisted, so an
 * imprecise guess is acceptable but a wrong-looking one is not — a currency the
 * app cannot render is replaced by {@link FALLBACK_CURRENCY}.
 */
export function getCurrencyForLocale(locale: string | undefined): string {
  if (!locale) {
    return FALLBACK_CURRENCY;
  }

  const [language, ...rest] = locale.replace(/_/g, '-').split('-');
  const explicitRegion = rest.find((subtag) => /^[A-Za-z]{2}$/.test(subtag));
  const region =
    explicitRegion?.toUpperCase() ??
    REGION_BY_LANGUAGE[language.toLowerCase()] ??
    '';

  const currency = CURRENCY_BY_REGION[region];

  return currency && isSupportedCurrency(currency)
    ? currency
    : FALLBACK_CURRENCY;
}
