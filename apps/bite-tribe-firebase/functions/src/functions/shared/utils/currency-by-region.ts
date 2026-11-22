/**
 * Region subtag to currency code, for the menu candidate verification derives
 * from Bites (GitHub issue #1511).
 *
 * Deliberately duplicated from `CURRENCY_BY_REGION` in
 * `libs/common/utils/src/lib/get-currency-for-device.ts` rather than imported:
 * the Functions project compiles with its own `tsconfig.json`, whose `rootDir`
 * is `src` and which has none of the workspace path mappings, so it cannot
 * reach a library. `__specs__/currency-by-region-parity.spec.ts` fails the
 * build when the two maps disagree, so change them together.
 *
 * Every currency here is one the apps can render, which is what lets a menu
 * carry it. Unlike the device helper, a region missing from the map has no
 * fallback: a menu states no currency rather than a guessed `EUR`.
 */
export const CURRENCY_BY_REGION: Readonly<Record<string, string>> = {
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

/** The currency of an ISO 3166-1 alpha-2 country code, if the map knows it. */
export const currencyForRegion = (
  countryCode: string | undefined,
): string | undefined => {
  const region = countryCode?.trim().toUpperCase();

  return region ? CURRENCY_BY_REGION[region] : undefined;
};
