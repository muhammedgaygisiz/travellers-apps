import { isIdpAvatarUrl } from '../is-idp-avatar-url';

describe(isIdpAvatarUrl.name, () => {
  describe('given no url', () => {
    it('should return false', () => {
      expect(isIdpAvatarUrl('')).toBe(false);
    });
  });

  describe('given some other url', () => {
    it('should return false', () => {
      expect(isIdpAvatarUrl('https://example.com/avatar.png')).toBe(false);
    });
  });

  describe('given a googleusercontent url', () => {
    it('should return true', () => {
      expect(
        isIdpAvatarUrl('https://lh3.googleusercontent.com/a-/AOh14GjVexample'),
      ).toBe(true);
      expect(
        isIdpAvatarUrl(
          'https://subdomain.googleusercontent.com/a-/AOh14GjVexample',
        ),
      ).toBe(true);
      expect(
        isIdpAvatarUrl('https://googleusercontent.com/a-/AOh14GjVexample'),
      ).toBe(true);
    });
  });

  describe('given a string that is not a url', () => {
    it('should return false', () => {
      expect(isIdpAvatarUrl('not a url')).toBe(false);
    });
  });
});
