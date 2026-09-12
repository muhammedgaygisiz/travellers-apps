import {
  CLIENT_LIMIT_PER_WINDOW,
  RATE_LIMIT_WINDOW_MS,
  TOKEN_LIMIT_PER_WINDOW,
  resetScanRateLimit,
  withinScanRateLimit,
} from '../scan-rate-limit';

/**
 * The two limits on the one callable a guest reaches without an account
 * (GitHub issue #1100).
 *
 * The counters are module state, so every test resets them first. That is the
 * honest shape of what this is: an instance-local count, which issue #1107 is
 * the place to make durable.
 */
describe('scan rate limit', () => {
  const start = Date.parse('2026-09-16T10:00:00Z');

  const scan = (token: string, client: string, now = start): boolean =>
    withinScanRateLimit({ token, client, now });

  beforeEach(() => resetScanRateLimit());

  it('admits a scan', () => {
    expect(scan('TOKEN-A', 'client-a')).toBe(true);
  });

  it('refuses one token past its limit within a window', () => {
    for (let attempt = 0; attempt < TOKEN_LIMIT_PER_WINDOW; attempt++) {
      expect(scan('TOKEN-A', `client-${attempt}`)).toBe(true);
    }

    expect(scan('TOKEN-A', 'client-last')).toBe(false);
  });

  /**
   * Enumeration is one request per token, so it never trips the per-token
   * count. This is the limit that sees it.
   */
  it('refuses one client past its limit however many tokens it names', () => {
    for (let attempt = 0; attempt < CLIENT_LIMIT_PER_WINDOW; attempt++) {
      expect(scan(`TOKEN-${attempt}`, 'client-a')).toBe(true);
    }

    expect(scan('TOKEN-LAST', 'client-a')).toBe(false);
  });

  it('lets a different client keep scanning a throttled token', () => {
    for (let attempt = 0; attempt <= TOKEN_LIMIT_PER_WINDOW; attempt++) {
      scan('TOKEN-A', 'client-a');
    }

    expect(scan('TOKEN-B', 'client-b')).toBe(true);
  });

  it('starts counting again in the next window', () => {
    for (let attempt = 0; attempt <= TOKEN_LIMIT_PER_WINDOW; attempt++) {
      scan('TOKEN-A', `client-${attempt}`);
    }

    expect(scan('TOKEN-A', 'client-next')).toBe(false);
    expect(scan('TOKEN-A', 'client-next', start + RATE_LIMIT_WINDOW_MS)).toBe(
      true,
    );
  });

  /**
   * A refused attempt is still counted. Otherwise a caller that keeps trying
   * would let its own window lapse and get a fresh allowance for hammering.
   */
  it('counts the attempts it refuses', () => {
    for (let attempt = 0; attempt < TOKEN_LIMIT_PER_WINDOW * 2; attempt++) {
      scan('TOKEN-A', `client-${attempt}`);
    }

    expect(
      scan('TOKEN-A', 'client-next', start + RATE_LIMIT_WINDOW_MS - 1),
    ).toBe(false);
  });

  /**
   * Both limits are counted on every call. A token over its own limit must not
   * shield the client behind it, because the client's window is what the next
   * token is judged against.
   */
  it('counts a scan against the client even when the token is already over', () => {
    for (let attempt = 0; attempt <= TOKEN_LIMIT_PER_WINDOW * 3; attempt++) {
      scan('TOKEN-A', 'client-a');
    }

    expect(scan('TOKEN-FRESH', 'client-a')).toBe(false);
  });
});
