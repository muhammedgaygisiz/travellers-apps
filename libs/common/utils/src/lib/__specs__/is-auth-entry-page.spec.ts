import * as isAuthEntryPageMod from '../is-auth-entry-page';

describe('isAuthEntryUrl', () => {
  it.each(['/', '/start', '/login', '/registration', '/forgot-password'])(
    'treats %s as a sign-in entry page',
    (url) => {
      expect(isAuthEntryPageMod.isAuthEntryUrl(url)).toBe(true);
    },
  );

  it.each(['/home', '/bite/12345', '/profile/user-1', '/my-bites'])(
    'treats %s as a page inside the app',
    (url) => {
      expect(isAuthEntryPageMod.isAuthEntryUrl(url)).toBe(false);
    },
  );

  it('accepts absolute URLs', () => {
    expect(isAuthEntryPageMod.isAuthEntryUrl('https://example.com/login')).toBe(
      true,
    );
    expect(
      isAuthEntryPageMod.isAuthEntryUrl('https://example.com/bite/12345'),
    ).toBe(false);
  });

  it('ignores the origin, query, fragment, and a trailing slash', () => {
    expect(isAuthEntryPageMod.isAuthEntryUrl('https://example.com')).toBe(true);
    expect(isAuthEntryPageMod.isAuthEntryUrl('https://example.com/')).toBe(
      true,
    );
    expect(isAuthEntryPageMod.isAuthEntryUrl('/start/?redirect=1#top')).toBe(
      true,
    );
    expect(isAuthEntryPageMod.isAuthEntryUrl('/bite/12345/?from=share')).toBe(
      false,
    );
  });

  it('does not mistake a nested path for its entry page', () => {
    expect(isAuthEntryPageMod.isAuthEntryUrl('/start/tour')).toBe(false);
  });
});

describe('isAuthEntryPage', () => {
  it('reports on the page the browser currently shows', () => {
    jest
      .spyOn(isAuthEntryPageMod, 'getHref')
      .mockReturnValue('https://example.com/bite/12345');

    expect(isAuthEntryPageMod.isAuthEntryPage()).toBe(false);
  });
});
