import { currencyCodes } from './currencies';
import { getRegionForTimeZone } from './get-region-for-time-zone';

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

/**
 * Region used when a locale carries only a language, e.g. `de` or `pt`.
 *
 * This is the weakest signal in {@link getCurrencyForDevice}: it guesses a
 * country from a language, which is only ever right by coincidence.
 */
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

/** What a device tells the web view about where it is and who is using it. */
export interface DeviceRegionSignals {
  /** Interface language tag, e.g. `navigator.language`. */
  readonly locale?: string;
  /** IANA time zone, e.g. `Intl.DateTimeFormat().resolvedOptions().timeZone`. */
  readonly timeZone?: string;
}

/** Region of the locale itself, e.g. `de-AT` -> `AT`, `de` -> `DE`. */
function getRegionForLocale(locale: string | undefined): string | undefined {
  if (!locale) {
    return undefined;
  }

  const [language, ...rest] = locale.replace(/_/g, '-').split('-');
  const explicitRegion = rest.find((subtag) => /^[A-Za-z]{2}$/.test(subtag));

  return (
    explicitRegion?.toUpperCase() ?? REGION_BY_LANGUAGE[language.toLowerCase()]
  );
}

/**
 * Best-effort default currency for a device, e.g. a device in `Europe/Zurich`
 * -> `CHF`.
 *
 * The time zone is asked first because it is the only region signal a web view
 * gets for free. The locale only says which language variant the user reads in,
 * and the two disagree for anyone living abroad — an English speaker in
 * Switzerland reports `en-GB`, which used to suggest pounds (issue #1262) — and
 * no web API exposes the device Region setting itself. The time zone also costs
 * no location permission, which the onboarding currency step has not asked for
 * at the point it needs a suggestion.
 *
 * The locale stays as the fallback for a device whose zone is not mapped, and
 * the language as the fallback for a locale that carries no region.
 *
 * The result is only a suggestion: the user confirms or changes it before it is
 * persisted, so an imprecise guess is acceptable but a wrong-looking one is not
 * — a currency the app cannot render is replaced by {@link FALLBACK_CURRENCY}.
 */
export function getCurrencyForDevice({
  locale,
  timeZone,
}: DeviceRegionSignals): string {
  const region =
    getRegionForTimeZone(timeZone) ?? getRegionForLocale(locale) ?? '';

  const currency = CURRENCY_BY_REGION[region];

  return currency && isSupportedCurrency(currency)
    ? currency
    : FALLBACK_CURRENCY;
}
