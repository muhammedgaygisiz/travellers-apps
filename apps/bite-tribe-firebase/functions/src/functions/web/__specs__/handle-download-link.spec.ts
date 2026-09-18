import {
  APP_STORE_URL,
  PLAY_STORE_URL,
  WEB_FALLBACK_URL,
  handleDownloadLink,
  resolveDownloadTarget,
} from '../handle-download-link';

jest.mock('firebase-functions', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('firebase-functions/https', () => ({
  onRequest: jest.fn((handler: unknown) => handler),
}));

/**
 * Real user agents rather than shortened ones. The two Instagram strings are
 * the reason this endpoint exists, and a rule that matches `iPhone` in
 * isolation but not in the string Instagram actually sends would pass a
 * hand-written fixture and fail in a story.
 */
const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

const IPHONE_INSTAGRAM =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 336.0.0.32.90 (iPhone14,5; iOS 17_5_1; en_US; en; scale=3.00; 1170x2532; 606753898)';

const IPAD_SAFARI =
  'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36';

const ANDROID_INSTAGRAM =
  'Mozilla/5.0 (Linux; Android 14; SM-S911B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/127.0.6533.103 Mobile Safari/537.36 Instagram 336.0.0.34.92 Android (34/14; 450dpi; 1080x2154; samsung; SM-S911B; dm1q; qcom; en_US; 606753898)';

const MAC_SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';

const WINDOWS_CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36';

describe('resolveDownloadTarget', () => {
  it.each([
    ['iPhone Safari', IPHONE_SAFARI],
    ["Instagram's in-app browser on iOS", IPHONE_INSTAGRAM],
    ['iPad Safari', IPAD_SAFARI],
  ])('sends %s to the App Store', (_name, userAgent) => {
    expect(resolveDownloadTarget(userAgent)).toBe(APP_STORE_URL);
  });

  it.each([
    ['Android Chrome', ANDROID_CHROME],
    ["Instagram's in-app browser on Android", ANDROID_INSTAGRAM],
  ])('sends %s to Google Play', (_name, userAgent) => {
    expect(resolveDownloadTarget(userAgent)).toBe(PLAY_STORE_URL);
  });

  it.each([
    ['macOS Safari', MAC_SAFARI],
    ['Windows Chrome', WINDOWS_CHROME],
    ['an unrecognised agent', 'curl/8.7.1'],
    ['an empty agent', ''],
  ])('sends %s to the web app', (_name, userAgent) => {
    expect(resolveDownloadTarget(userAgent)).toBe(WEB_FALLBACK_URL);
  });

  it('sends a request without a user agent to the web app', () => {
    expect(resolveDownloadTarget(undefined)).toBe(WEB_FALLBACK_URL);
  });

  it('carries no storefront segment in the App Store URL', () => {
    expect(APP_STORE_URL).toBe('https://apps.apple.com/app/id6746098595');
  });
});

describe('handleDownloadLink', () => {
  interface FakeResponse {
    set: jest.Mock;
    redirect: jest.Mock;
    headers: Record<string, string>;
  }

  const fakeResponse = (): FakeResponse => {
    const headers: Record<string, string> = {};

    return {
      headers,
      set: jest.fn((name: string, value: string) => {
        headers[name] = value;
      }),
      redirect: jest.fn(),
    };
  };

  // `onRequest` is mocked to hand the raw handler back, so the export is the
  // function the runtime would call with a request and a response.
  const handler = handleDownloadLink as unknown as (
    req: unknown,
    res: unknown,
  ) => void;

  const call = (userAgent: string | undefined): FakeResponse => {
    const res = fakeResponse();

    handler({ get: jest.fn(() => userAgent) }, res);

    return res;
  };

  it('redirects an iPhone to the App Store with a 302', () => {
    const res = call(IPHONE_INSTAGRAM);

    expect(res.redirect).toHaveBeenCalledWith(302, APP_STORE_URL);
  });

  it('redirects an Android phone to Google Play with a 302', () => {
    const res = call(ANDROID_INSTAGRAM);

    expect(res.redirect).toHaveBeenCalledWith(302, PLAY_STORE_URL);
  });

  it('redirects a desktop browser to the web app with a 302', () => {
    const res = call(WINDOWS_CHROME);

    expect(res.redirect).toHaveBeenCalledWith(302, WEB_FALLBACK_URL);
  });

  // One visitor's platform must never be served to the next one from the
  // Hosting CDN, which is the only way this endpoint fails without an error.
  it('keeps the response out of every cache', () => {
    const res = call(IPHONE_SAFARI);

    expect(res.headers['Cache-Control']).toBe('no-store');
    expect(res.headers['Vary']).toBe('User-Agent');
  });
});
