import {
  linkNetworkIcon,
  linkNetworkName,
  linkNetworkOf,
} from '../link-network';

/** See GitHub issue #2224. */
describe('link networks', () => {
  it('reads a link saved as Twitter as X', () => {
    expect(linkNetworkOf('twitter')).toBe('x');
    expect(linkNetworkOf('instagram')).toBe('instagram');
    expect(linkNetworkOf(undefined)).toBe('');
  });

  it.each([
    ['tiktok', 'TikTok'],
    ['linkedin', 'LinkedIn'],
    ['x', 'X'],
    ['twitter', 'X'],
    ['website', 'Website'],
    ['mastodon', 'Mastodon'],
    [undefined, ''],
  ])('writes %s as %s', (network, name) => {
    expect(linkNetworkName(network)).toBe(name);
  });

  it.each([
    ['instagram', 'logo-instagram'],
    ['twitter', 'logo-x'],
    ['tiktok', 'logo-tiktok'],
    ['website', 'globe-outline'],
  ])('shows %s with %s', (network, icon) => {
    expect(linkNetworkIcon(network)).toBe(icon);
  });
});
