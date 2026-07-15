import {
  isValidNormalizedDisplayName,
  normalizeDisplayName,
} from '../display-name-utils';

describe('display name utilities', () => {
  describe('normalizeDisplayName', () => {
    it('trims surrounding whitespace and lowercases', () => {
      expect(normalizeDisplayName('  Bob Smith  ')).toBe('bob smith');
    });

    it('collapses casing so different casings normalize equally', () => {
      expect(normalizeDisplayName('FOODIE')).toBe(
        normalizeDisplayName('foodie'),
      );
    });

    it('keeps inner spacing untouched', () => {
      expect(normalizeDisplayName('  Mo   G ')).toBe('mo   g');
    });
  });

  describe('isValidNormalizedDisplayName', () => {
    it('accepts a normal name', () => {
      expect(isValidNormalizedDisplayName('bob')).toBe(true);
    });

    it('rejects an empty name', () => {
      expect(isValidNormalizedDisplayName('')).toBe(false);
    });

    it('rejects names containing a slash (invalid document id)', () => {
      expect(isValidNormalizedDisplayName('a/b')).toBe(false);
    });

    it('rejects the reserved dot ids', () => {
      expect(isValidNormalizedDisplayName('.')).toBe(false);
      expect(isValidNormalizedDisplayName('..')).toBe(false);
    });
  });
});
