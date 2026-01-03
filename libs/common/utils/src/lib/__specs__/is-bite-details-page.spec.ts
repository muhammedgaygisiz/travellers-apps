import { describe, expect, it, vi } from 'vitest';
import * as isBiteDetailsPageMod from '../is-bite-details-page';

describe('isBiteDetailsPage', () => {
  describe('given a bite detail page', () => {
    it('should return true', () => {
      vi.spyOn(isBiteDetailsPageMod, 'getHref').mockReturnValue(
        'https://example.com/bite/12345',
      );

      expect(isBiteDetailsPageMod.isBiteDetailsPage()).toBe(true);
    });
  });

  describe('given a non bite detail page', () => {
    it('should return false', () => {
      vi.spyOn(isBiteDetailsPageMod, 'getHref').mockReturnValue(
        'https://example.com/home',
      );

      expect(isBiteDetailsPageMod.isBiteDetailsPage()).toBe(false);
    });
  });
});
