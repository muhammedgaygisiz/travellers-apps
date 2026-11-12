import { Timestamp } from 'firebase-admin/firestore';
import {
  MISSING_CACHE_CONTROL,
  PUBLISHED_CACHE_CONTROL,
  SITEMAP_CACHE_CONTROL,
  renderCityPage,
} from '../render-city-page';

const mockGet = jest.fn();
const mockDoc = jest.fn(() => ({ get: mockGet }));
const mockQueryGet = jest.fn();
const mockWhere = jest.fn(() => ({ get: mockQueryGet }));

jest.mock('firebase-admin/firestore', () => {
  class Timestamp {
    constructor(private readonly ms: number) {}
    toDate(): Date {
      return new Date(this.ms);
    }
  }

  return {
    Timestamp,
    getFirestore: jest.fn(() => ({
      collection: jest.fn(() => ({ doc: mockDoc, where: mockWhere })),
    })),
  };
});

jest.mock('firebase-functions', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('firebase-functions/https', () => ({
  onRequest: jest.fn((handler: unknown) => handler),
}));

type Res = {
  status: jest.Mock;
  send: jest.Mock;
  set: jest.Mock;
  redirect: jest.Mock;
};
type Handler = (req: { path: string }, res: Res) => Promise<void>;

const handler = renderCityPage as unknown as Handler;

const respond = async (
  path: string,
): Promise<{
  status: number;
  body: string;
  headers: Record<string, string>;
  location?: string;
}> => {
  const res: Res = {
    status: jest.fn(),
    send: jest.fn(),
    set: jest.fn(),
    redirect: jest.fn(),
  };
  res.status.mockReturnValue(res);

  await handler({ path }, res);

  if (res.redirect.mock.calls.length) {
    const [status, location] = res.redirect.mock.calls[0];
    return {
      status,
      body: '',
      headers: Object.fromEntries(res.set.mock.calls),
      location,
    };
  }

  return {
    status: res.status.mock.calls[0][0],
    body: res.send.mock.calls[0][0],
    headers: Object.fromEntries(res.set.mock.calls),
  };
};

const snapshot = (data?: Record<string, unknown>): unknown => ({
  exists: !!data,
  data: () => data,
});

const item = (
  n: number,
  extra: Record<string, unknown> = {},
): Record<string, unknown> => ({
  biteId: `bite-${n}`,
  name: `Dish ${n}`,
  imageUrl: `https://example.test/${n}.jpg`,
  place: `Place ${n}`,
  locality: 'Mitte, Berlin',
  ...extra,
});

const page = {
  city: 'berlin',
  cityName: 'Berlin',
  countryCode: 'DE',
  locale: 'en',
  status: 'published',
  title: 'The best sushi in Berlin',
  metaDescription: 'Five sushi places in Berlin, picked from real Bites.',
  intro: 'Why these five.',
  items: [item(1), item(2), item(3)],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- parsed JSON-LD
const jsonLd = (body: string): any => {
  const match = body.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
  );
  expect(match).not.toBeNull();
  return JSON.parse(match?.[1] ?? '{}');
};

describe('renderCityPage', () => {
  // No page is found by alias unless a test says so.
  beforeEach(() => mockQueryGet.mockResolvedValue({ docs: [] }));
  afterEach(() => jest.clearAllMocks());

  it('renders a published page as a complete document', async () => {
    mockGet.mockResolvedValue(snapshot(page));

    const { status, body, headers } = await respond('/eat/berlin');

    expect(mockDoc).toHaveBeenCalledWith('berlin');
    expect(status).toBe(200);
    expect(body).toMatch(/^<!doctype html>/);
    expect(body).toContain('<title>The best sushi in Berlin</title>');
    expect(body).toContain(
      '<meta name="description" content="Five sushi places in Berlin, picked from real Bites." />',
    );
    expect(body).toContain('Why these five.');
    for (const n of [1, 2, 3]) {
      expect(body).toContain(`<h2>Dish ${n}</h2>`);
      expect(body).toContain(`Place ${n} · Mitte, Berlin`);
      expect(body).toContain(`src="https://example.test/${n}.jpg"`);
    }
    expect(body).toContain(
      '<meta property="og:image" content="https://example.test/1.jpg" />',
    );
    expect(headers['Cache-Control']).toBe(PUBLISHED_CACHE_CONTROL);
  });

  it('carries the BiteTribe logo in its header', async () => {
    mockGet.mockResolvedValue(snapshot(page));

    const { body } = await respond('/eat/berlin');

    expect(body).toContain(
      '<img src="https://bitetribe.app/assets/icons/logo.svg" alt="" width="28" height="36" />BiteTribe',
    );
  });

  it('declares its canonical on bitetribe.app', async () => {
    mockGet.mockResolvedValue(snapshot(page));

    const { body } = await respond('/eat/berlin');

    expect(body).toContain(
      '<link rel="canonical" href="https://bitetribe.app/eat/berlin" />',
    );
    expect(body).not.toContain('bite-tribe.web.app');
  });

  it('does not redirect and carries no executable script', async () => {
    mockGet.mockResolvedValue(snapshot(page));

    const { body } = await respond('/eat/berlin');

    expect(body).not.toContain('http-equiv="refresh"');
    // The one script element is the JSON-LD block, which never runs.
    expect(body.match(/<script[^>]*>/g)).toEqual([
      '<script type="application/ld+json">',
    ]);
  });

  it('renders operator text with repeated metacharacters as text', async () => {
    const crafted = `<>&'"" ><script>alert(1)</script>`;
    mockGet.mockResolvedValue(
      snapshot({
        ...page,
        title: crafted,
        intro: crafted,
        items: [item(1, { name: crafted, place: crafted }), item(2), item(3)],
      }),
    );

    const { body } = await respond('/eat/berlin');

    expect(body).not.toContain('<script>');
    expect(body).not.toMatch(/<\/script>[^\n]*<\/script>/);
    expect(body).toContain('&lt;&gt;&amp;&#039;&quot;&quot;');
    // Inside the JSON-LD the crafted name cannot close the element.
    expect(jsonLd(body).itemListElement[0].item.hasMenu.hasMenuItem.name).toBe(
      crafted,
    );
  });

  it.each([
    ['an unknown city', undefined, '/eat/berlin'],
    ['a draft', { ...page, status: 'draft' }, '/eat/berlin'],
  ])('answers %s with 404', async (_case, data, path) => {
    mockGet.mockResolvedValue(snapshot(data));

    const { status, headers } = await respond(path);

    expect(status).toBe(404);
    expect(headers['Cache-Control']).toBe(MISSING_CACHE_CONTROL);
  });

  it.each([
    '/eat',
    '/eat/berlin/best-sushi',
    '/eat/Berlin',
    '/eat/ber.lin',
    '/eat/berlin%2Fpages',
    '/s/x/y',
  ])(
    'answers the malformed path %s with 404 without reading Firestore',
    async (path) => {
      const { status } = await respond(path);

      expect(status).toBe(404);
      expect(mockGet).not.toHaveBeenCalled();
    },
  );

  it('answers a withdrawn page with 410', async () => {
    mockGet.mockResolvedValue(snapshot({ ...page, status: 'withdrawn' }));

    const { status, body } = await respond('/eat/berlin');

    expect(status).toBe(410);
    expect(body).toBe('Gone');
  });

  describe('structured data', () => {
    it('declares an ItemList of restaurants carrying each dish, in order', async () => {
      mockGet.mockResolvedValue(snapshot(page));

      const data = jsonLd((await respond('/eat/berlin')).body);

      expect(data).toMatchObject({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'The best sushi in Berlin',
        url: 'https://bitetribe.app/eat/berlin',
        numberOfItems: 3,
      });
      expect(data.itemListElement).toHaveLength(3);
      expect(data.itemListElement[1]).toEqual({
        '@type': 'ListItem',
        position: 2,
        item: {
          '@type': 'Restaurant',
          name: 'Place 2',
          image: 'https://example.test/2.jpg',
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Mitte, Berlin',
            addressCountry: 'DE',
          },
          hasMenu: {
            '@type': 'Menu',
            hasMenuItem: {
              '@type': 'MenuItem',
              name: 'Dish 2',
              image: 'https://example.test/2.jpg',
            },
          },
        },
      });
    });

    it('carries an absolute image in Open Graph and Twitter', async () => {
      mockGet.mockResolvedValue(snapshot(page));

      const { body } = await respond('/eat/berlin');

      expect(body).toContain(
        '<meta property="og:image" content="https://example.test/1.jpg" />',
      );
      expect(body).toContain(
        '<meta name="twitter:image" content="https://example.test/1.jpg" />',
      );
    });
  });

  describe('sitemap', () => {
    const doc = (
      id: string,
      data: Record<string, unknown>,
    ): { id: string; data: () => Record<string, unknown> } => ({
      id,
      data: (): Record<string, unknown> => data,
    });

    it('lists the published pages with their publication date', async () => {
      mockQueryGet.mockResolvedValue({
        docs: [
          doc('berlin', {
            ...page,
            publishedAt: new Timestamp(Date.UTC(2026, 10, 12)),
          }),
          doc('hamburg', { ...page }),
        ],
      });

      const { status, body, headers } = await respond('/eat/sitemap.xml');

      expect(mockWhere).toHaveBeenCalledWith('status', '==', 'published');
      expect(mockGet).not.toHaveBeenCalled();
      expect(status).toBe(200);
      expect(headers['Content-Type']).toBe('application/xml; charset=utf-8');
      // Minutes, not the pages' hour plus a day of stale-while-revalidate:
      // the CDN must not keep an old published set (issue #1980).
      expect(headers['Cache-Control']).toBe(SITEMAP_CACHE_CONTROL);
      expect(SITEMAP_CACHE_CONTROL).toBe('public, max-age=300, s-maxage=300');
      expect(body).toContain(
        '<loc>https://bitetribe.app/eat/berlin</loc>\n    <lastmod>2026-11-12</lastmod>',
      );
      expect(body).toContain('<loc>https://bitetribe.app/eat/hamburg</loc>');
      expect(body.match(/<url>/g)).toHaveLength(2);
    });

    it('is an empty urlset when nothing is published', async () => {
      mockQueryGet.mockResolvedValue({ docs: [] });

      const { status, body } = await respond('/eat/sitemap.xml');

      expect(status).toBe(200);
      expect(body).toContain('<urlset');
      expect(body).not.toContain('<url>');
    });
  });

  describe('call to action', () => {
    it('renders exactly one primary call to action, carrying the city', async () => {
      mockGet.mockResolvedValue(snapshot(page));

      const { body } = await respond('/eat/berlin');

      expect(body.match(/data-cta="primary"/g)).toHaveLength(1);
      expect(body).toContain(
        '<a class="cta" data-cta="primary" href="https://bitetribe.app/?city_page=berlin">',
      );
    });

    it('links every entry to its Bite in the app, carrying the city', async () => {
      mockGet.mockResolvedValue(snapshot(page));

      const { body } = await respond('/eat/berlin');

      for (const n of [1, 2, 3]) {
        expect(body).toContain(
          `<a class="entry" href="https://bitetribe.app/bite/bite-${n}?city_page=berlin">`,
        );
      }
    });

    it('offers the store badges and QR codes the web app already ships', async () => {
      mockGet.mockResolvedValue(snapshot(page));

      const { body } = await respond('/eat/berlin');

      expect(body).toContain(
        'src="https://bitetribe.app/assets/store/app-store-qr.svg"',
      );
      expect(body).toContain(
        'src="https://bitetribe.app/assets/store/google-play-qr.svg"',
      );
      expect(body).toContain(
        'src="https://bitetribe.app/assets/store/app-store-badge-black.svg"',
      );
      expect(body).toContain(
        'srcset="https://bitetribe.app/assets/store/app-store-badge-white.svg" media="(prefers-color-scheme: dark)"',
      );
      expect(body).toContain(
        'src="https://bitetribe.app/assets/store/google-play-badge.png"',
      );
      expect(body).toContain('aria-label="Download on the App Store"');
      expect(body).toContain('aria-label="Get it on Google Play"');
      expect(body).toContain('href="https://apps.apple.com/app/id6746098595"');
      expect(body).toContain(
        'href="https://play.google.com/store/apps/details?id=com.bitetribe.app"',
      );
    });

    it('adds no analytics, cookie or storage to the page', async () => {
      mockGet.mockResolvedValue(snapshot(page));

      const { body, headers } = await respond('/eat/berlin');

      expect(body).not.toMatch(/gtag|googletagmanager|analytics/i);
      expect(body).not.toMatch(/document\.cookie|localStorage|sessionStorage/);
      expect(Object.keys(headers)).not.toContain('Set-Cookie');
    });
  });

  describe('aliases', () => {
    const aliasOf = (data: Record<string, unknown>): unknown => ({
      docs: [{ id: 'cologne', data: (): Record<string, unknown> => data }],
    });
    const cologne = {
      ...page,
      city: 'cologne',
      cityName: 'Cologne',
      aliases: ['koeln'],
    };

    it('redirects an alias of a published page, for good, to its own URL', async () => {
      mockGet.mockResolvedValue(snapshot());
      mockQueryGet.mockResolvedValue(aliasOf(cologne));

      const { status, location, headers } = await respond('/eat/koeln');

      expect(mockDoc).toHaveBeenCalledWith('koeln');
      expect(mockWhere).toHaveBeenCalledWith(
        'aliases',
        'array-contains',
        'koeln',
      );
      expect(status).toBe(301);
      expect(location).toBe('https://bitetribe.app/eat/cologne');
      expect(headers['Cache-Control']).toBe(PUBLISHED_CACHE_CONTROL);
    });

    it.each([
      ['a draft', 'draft', 404],
      ['a withdrawn page', 'withdrawn', 410],
    ])(
      'answers an alias of %s as the page itself would',
      async (_case, status, expected) => {
        mockGet.mockResolvedValue(snapshot());
        mockQueryGet.mockResolvedValue(aliasOf({ ...cologne, status }));

        const response = await respond('/eat/koeln');

        expect(response.status).toBe(expected);
        expect(response.location).toBeUndefined();
      },
    );

    it('serves the page under its own city without looking for aliases', async () => {
      mockGet.mockResolvedValue(snapshot(cologne));

      const { status } = await respond('/eat/cologne');

      expect(status).toBe(200);
      expect(mockWhere).not.toHaveBeenCalled();
    });

    it('lists only the canonical URL in the sitemap', async () => {
      mockQueryGet.mockResolvedValue({
        docs: [{ id: 'cologne', data: (): Record<string, unknown> => cologne }],
      });

      const { body } = await respond('/eat/sitemap.xml');

      expect(body).toContain('<loc>https://bitetribe.app/eat/cologne</loc>');
      expect(body).not.toContain('koeln');
    });
  });
});
