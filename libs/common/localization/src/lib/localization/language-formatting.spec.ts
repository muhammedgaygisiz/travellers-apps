import { SupportedLang, LANG_TO_LOCALE_MAP } from './model/supported-lang';
import { formatNumber } from '@angular/common';

describe('Language and Price Formatting', () => {
  describe('SupportedLang', () => {
    it('should include German variants', () => {
      expect(SupportedLang.DE_DE).toBe('de-DE');
      expect(SupportedLang.DE_CH).toBe('de-CH');
      expect(SupportedLang.EN).toBe('en');
    });
  });

  describe('LANG_TO_LOCALE_MAP', () => {
    it('should map languages to correct locales', () => {
      expect(LANG_TO_LOCALE_MAP[SupportedLang.DE_DE]).toBe('de-DE');
      expect(LANG_TO_LOCALE_MAP[SupportedLang.DE_CH]).toBe('de-CH');
      expect(LANG_TO_LOCALE_MAP[SupportedLang.EN]).toBe('en-US');
    });
  });

  describe('Price formatting', () => {
    it('should format prices correctly for German (Germany)', () => {
      const price = 12.5;
      const formatted = formatNumber(price, 'de-DE', '1.2-2');
      expect(formatted).toBe('12,50'); // German format uses comma as decimal separator
    });

    it('should format prices correctly for German (Switzerland)', () => {
      const price = 12.5;
      const formatted = formatNumber(price, 'de-CH', '1.2-2');
      expect(formatted).toBe('12.50'); // Swiss format uses period as decimal separator
    });

    it('should format prices correctly for English', () => {
      const price = 12.5;
      const formatted = formatNumber(price, 'en-US', '1.2-2');
      expect(formatted).toBe('12.50'); // US format uses period as decimal separator
    });
  });
});
