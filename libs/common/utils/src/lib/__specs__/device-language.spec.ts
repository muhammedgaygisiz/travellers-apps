import { languageForLocale } from '../device-language';

const SHIPPED = ['en', 'de', 'tr', 'fr', 'zh'];

describe('languageForLocale', () => {
  it.each([
    ['tr-TR', 'tr'],
    ['tr', 'tr'],
    ['de_AT', 'de'],
    ['FR-ca', 'fr'],
    ['zh-CN', 'zh'],
    ['zh-Hans-TW', 'zh'],
  ])('maps %s to the shipped language %s', (locale, expected) => {
    expect(languageForLocale(locale, SHIPPED)).toBe(expected);
  });

  it.each(['pl-PL', 'nb', ''])(
    'falls back to English for %p, which is not shipped',
    (locale) => {
      expect(languageForLocale(locale, SHIPPED)).toBe('en');
    },
  );

  it.each(['zh-Hant', 'zh-TW', 'zh-HK', 'zh-MO', 'zh-Hant-CN'])(
    'gives English to %s, which reads Traditional Chinese',
    (locale) => {
      expect(languageForLocale(locale, SHIPPED)).toBe('en');
    },
  );
});
