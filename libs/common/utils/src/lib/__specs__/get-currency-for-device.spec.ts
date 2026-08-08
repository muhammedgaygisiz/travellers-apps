import { getCurrencyForDevice } from '../get-currency-for-device';

describe('getCurrencyForDevice', () => {
  it('maps the device time zone to that region currency', () => {
    expect(getCurrencyForDevice({ timeZone: 'Europe/Zurich' })).toBe('CHF');
    expect(getCurrencyForDevice({ timeZone: 'Asia/Tokyo' })).toBe('JPY');
    expect(getCurrencyForDevice({ timeZone: 'America/New_York' })).toBe('USD');
  });

  it('prefers the device region over the interface language variant', () => {
    // The reported case: an English speaker living in Switzerland. iOS keeps
    // the `en-GB` variant the user reads in, while the device sits in Bern.
    expect(
      getCurrencyForDevice({ locale: 'en-GB', timeZone: 'Europe/Zurich' }),
    ).toBe('CHF');
    // The mirror image: a German speaker whose device is in the UK.
    expect(
      getCurrencyForDevice({ locale: 'de-DE', timeZone: 'Europe/London' }),
    ).toBe('GBP');
  });

  it('accepts time zone aliases and odd casing', () => {
    expect(getCurrencyForDevice({ timeZone: 'Asia/Calcutta' })).toBe('INR');
    expect(getCurrencyForDevice({ timeZone: 'Europe/Kiev' })).toBe('UAH');
    expect(getCurrencyForDevice({ timeZone: 'europe/zurich' })).toBe('CHF');
  });

  it('falls back to the locale region when the time zone is unmapped', () => {
    expect(
      getCurrencyForDevice({ locale: 'de-AT', timeZone: 'Africa/Kampala' }),
    ).toBe('EUR');
    expect(getCurrencyForDevice({ locale: 'en-GB' })).toBe('GBP');
    expect(getCurrencyForDevice({ locale: 'tr-TR' })).toBe('TRY');
  });

  it('falls back to the language default region when no region is given', () => {
    expect(getCurrencyForDevice({ locale: 'en' })).toBe('USD');
    expect(getCurrencyForDevice({ locale: 'de' })).toBe('EUR');
    expect(getCurrencyForDevice({ locale: 'th' })).toBe('THB');
  });

  it('accepts underscore separated and lowercase locales', () => {
    expect(getCurrencyForDevice({ locale: 'pt_BR' })).toBe('BRL');
    expect(getCurrencyForDevice({ locale: 'en-us' })).toBe('USD');
  });

  it('ignores script subtags when resolving the region', () => {
    expect(getCurrencyForDevice({ locale: 'zh-Hant-TW' })).toBe('TWD');
  });

  it('falls back to EUR for unknown or missing signals', () => {
    expect(getCurrencyForDevice({})).toBe('EUR');
    expect(getCurrencyForDevice({ locale: '', timeZone: '' })).toBe('EUR');
    expect(
      getCurrencyForDevice({ locale: 'xx-YY', timeZone: 'Mars/Olympus_Mons' }),
    ).toBe('EUR');
  });
});
