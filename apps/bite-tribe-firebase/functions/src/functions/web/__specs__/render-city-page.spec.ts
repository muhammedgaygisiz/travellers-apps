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

  describe('photo alt text (#2326)', () => {
    const alts = (body: string): string[] =>
      [
        ...body.matchAll(
          /<img src="https:\/\/example\.test[^"]*" alt="([^"]*)"/g,
        ),
      ].map((match) => match[1]);

    it('names the dish, the restaurant and where it is', async () => {
      mockGet.mockResolvedValue(snapshot(page));

      const { body } = await respond('/eat/berlin');

      expect(alts(body)).toEqual([
        'Dish 1 at Place 1 in Mitte, Berlin',
        'Dish 2 at Place 2 in Mitte, Berlin',
        'Dish 3 at Place 3 in Mitte, Berlin',
      ]);
    });

    it('falls back to the city and leaves out what is not stored', async () => {
      mockGet.mockResolvedValue(
        snapshot({
          ...page,
          items: [
            item(1, { locality: undefined }),
            item(2, { place: '', locality: '  ' }),
            item(3, { name: 'Fish & "Chips"', place: undefined }),
          ],
        }),
      );

      const { body } = await respond('/eat/berlin');

      expect(alts(body)).toEqual([
        'Dish 1 at Place 1 in Berlin',
        'Dish 2 in Berlin',
        'Fish &amp; &quot;Chips&quot; in Mitte, Berlin',
      ]);
    });
  });

  it('links the header to the Instagram account with its own glyph', async () => {
    mockGet.mockResolvedValue(snapshot(page));

    const { body } = await respond('/eat/berlin');
    const header = body.slice(
      body.indexOf('<header>'),
      body.indexOf('</header>'),
    );

    expect(header).toContain(
      '<a class="ig" href="https://www.instagram.com/bitetribeapp/" rel="noopener" aria-label="BiteTribe on Instagram">',
    );
    expect(header).toContain(
      'src="https://bitetribe.app/assets/social/instagram-glyph-black.svg"',
    );
    expect(header).toContain(
      'srcset="https://bitetribe.app/assets/social/instagram-glyph-white.svg" media="(prefers-color-scheme: dark)"',
    );
    // Nothing is loaded from an Instagram host: the glyph is ours to serve.
    expect(body).not.toMatch(/src="https:\/\/[^"/]*(instagram|fbcdn)/);
  });

  it('carries the BiteTribe logo in its header', async () => {
    mockGet.mockResolvedValue(snapshot(page));

    const { body } = await respond('/eat/berlin');

    expect(body).toContain(
      '<img src="https://bitetribe.app/assets/icons/logo.svg" alt="" width="28" height="36" />BiteTribe',
    );
  });

  it('links the imprint from its footer', async () => {
    mockGet.mockResolvedValue(snapshot(page));

    const { body } = await respond('/eat/berlin');

    expect(body).toContain(
      '<a href="https://bitetribe.app/imprint">Imprint</a>',
    );
  });

  it('declares its canonical on bitetribe.app', async () => {
    mockGet.mockResolvedValue(snapshot(page));

    const { body } = await respond('/eat/berlin');

    expect(body).toContain(
      '<link rel="canonical" href="https://bitetribe.app/eat/berlin" />',
    );
    // The entries link through bite-tribe.web.app so an installed app opens
    // them (issue #2101); nothing else on the page names that host.
    expect(
      body.replace(
        /href="https:\/\/bite-tribe\.web\.app\/s\/bite\/[^"]+"/g,
        '',
      ),
    ).not.toContain('bite-tribe.web.app');
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
      // The index of them all, dated by the newest publication (#2091).
      expect(body).toContain(
        '<loc>https://bitetribe.app/eat</loc>\n    <lastmod>2026-11-12</lastmod>',
      );
      expect(body.match(/<url>/g)).toHaveLength(3);
    });

    it('lists each page photo once, escaped, under its own page (#2326)', async () => {
      const tokened = 'https://example.test/o/a.jpg?alt=media&token=t1';
      mockQueryGet.mockResolvedValue({
        docs: [
          doc('berlin', {
            ...page,
            publishedAt: new Timestamp(Date.UTC(2026, 10, 12)),
            items: [
              item(1, { imageUrl: tokened }),
              item(2),
              item(3, { imageUrl: tokened }),
            ],
          }),
          doc('hamburg', { ...page, items: [item(4)] }),
        ],
      });

      const { body } = await respond('/eat/sitemap.xml');

      expect(body).toContain(
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
      );
      expect(body).toContain(`  <url>
    <loc>https://bitetribe.app/eat/berlin</loc>
    <lastmod>2026-11-12</lastmod>
    <image:image>
      <image:loc>https://example.test/o/a.jpg?alt=media&amp;token=t1</image:loc>
    </image:image>
    <image:image>
      <image:loc>https://example.test/2.jpg</image:loc>
    </image:image>
  </url>`);
      expect(body).toContain(`  <url>
    <loc>https://bitetribe.app/eat/hamburg</loc>
    <image:image>
      <image:loc>https://example.test/4.jpg</image:loc>
    </image:image>
  </url>`);
      // The index carries no photo of its own, and nothing raw slips through.
      expect(body).toContain(
        '<loc>https://bitetribe.app/eat</loc>\n    <lastmod>2026-11-12</lastmod>\n  </url>',
      );
      expect(body.match(/<image:image>/g)).toHaveLength(3);
      expect(body).not.toMatch(/&(?!amp;|lt;|gt;|quot;|#039;)/);
      expect(body).not.toMatch(/image:(caption|title|geo_location|license)/);
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
          `<a class="entry" href="https://bite-tribe.web.app/s/bite/bite-${n}?city_page=berlin">`,
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
  describe('the city index at /eat (#2091)', () => {
    const doc = (
      id: string,
      data: Record<string, unknown>,
    ): { id: string; data: () => Record<string, unknown> } => ({
      id,
      data: (): Record<string, unknown> => data,
    });
    const city = (
      id: string,
      cityName: string,
      countryCode: string,
      extra: Record<string, unknown> = {},
    ): { id: string; data: () => Record<string, unknown> } =>
      doc(id, {
        ...page,
        city: id,
        cityName,
        countryCode,
        title: `Top 5 dishes in ${cityName}`,
        ...extra,
      });

    it('lists every published city, grouped by country', async () => {
      mockQueryGet.mockResolvedValue({
        docs: [
          city('zurich', 'Zurich', 'CH'),
          city('bern', 'Bern', 'CH'),
          city('berlin', 'Berlin', 'DE'),
        ],
      });

      const { status, body, headers } = await respond('/eat');

      expect(mockWhere).toHaveBeenCalledWith('status', '==', 'published');
      expect(status).toBe(200);
      expect(headers['Content-Type']).toBe('text/html; charset=utf-8');
      // A new city shows within minutes, like the sitemap.
      expect(headers['Cache-Control']).toBe(SITEMAP_CACHE_CONTROL);
      expect(body).toMatch(/^<!doctype html>/);
      expect(body).toContain(
        '<title>What to eat in 3 cities – BiteTribe</title>',
      );
      expect(body).toContain(
        '<h1>What you&#039;ll find on BiteTribe in 3 cities</h1>',
      );
      for (const id of ['zurich', 'bern', 'berlin']) {
        expect(body).toContain(`href="https://bitetribe.app/eat/${id}"`);
      }
      // Countries by name, cities by name within each.
      const order = ['Germany', 'Switzerland', '>Bern<', '>Zurich<'].map(
        (text) => body.indexOf(text),
      );
      expect(order.every((at) => at > 0)).toBe(true);
      expect([...order].sort((a, b) => a - b)).toEqual(order);
      expect(body).toContain('class="country-group n2"');
      expect(body).toContain('🇨🇭');
    });

    it('also answers with a trailing slash', async () => {
      mockQueryGet.mockResolvedValue({ docs: [city('bern', 'Bern', 'CH')] });

      const { status } = await respond('/eat/');

      expect(status).toBe(200);
    });

    it('declares itself canonical and lists the cities as structured data', async () => {
      mockQueryGet.mockResolvedValue({
        docs: [city('bern', 'Bern', 'CH'), city('berlin', 'Berlin', 'DE')],
      });

      const { body } = await respond('/eat');

      expect(body).toContain(
        '<link rel="canonical" href="https://bitetribe.app/eat" />',
      );
      const data = jsonLd(body);
      expect(data['@type']).toBe('ItemList');
      expect(data.url).toBe('https://bitetribe.app/eat');
      expect(
        data.itemListElement.map((entry: { url: string }) => entry.url),
      ).toEqual([
        'https://bitetribe.app/eat/berlin',
        'https://bitetribe.app/eat/bern',
      ]);
    });

    it('answers 404 while nothing is published', async () => {
      mockQueryGet.mockResolvedValue({ docs: [] });

      const { status, headers } = await respond('/eat');

      expect(status).toBe(404);
      expect(headers['Cache-Control']).toBe(MISSING_CACHE_CONTROL);
    });

    it('carries a post link only for a city that has one', async () => {
      mockQueryGet.mockResolvedValue({
        docs: [
          city('malta', 'Malta', 'MT', {
            instagramPostUrl: 'https://www.instagram.com/p/abc/',
          }),
          city('bern', 'Bern', 'CH'),
        ],
      });

      const { body } = await respond('/eat');

      expect(body.match(/See the post on/g)).toHaveLength(1);
      expect(body).toContain(
        '<a href="https://www.instagram.com/p/abc/" rel="noopener">Instagram</a>',
      );
      expect(body).not.toContain('>Facebook</a>');
    });

    it('places one bite character for every seven cities or so', async () => {
      const docs = Array.from({ length: 10 }, (_, n) =>
        city(`city-${n}`, `City ${n}`, 'DE'),
      );
      mockQueryGet.mockResolvedValue({ docs });

      const { body } = await respond('/eat');

      expect(body.match(/class="tribe-tile /g)).toHaveLength(2);
    });

    it('loads nothing from Instagram, Facebook or any analytics', async () => {
      mockQueryGet.mockResolvedValue({
        docs: [
          city('malta', 'Malta', 'MT', {
            instagramPostUrl: 'https://www.instagram.com/p/abc/',
            facebookPostUrl: 'https://www.facebook.com/bitetribeapp/posts/1',
          }),
        ],
      });

      const { body } = await respond('/eat');

      // The glyph next to the account link is served from bitetribe.app;
      // what must not appear is anything loaded from a Meta host.
      expect(body).not.toMatch(
        /(src|srcset)="https:\/\/[^/"]*(instagram|facebook)/,
      );
      expect(body).not.toMatch(/gtag|googletagmanager|analytics/i);
    });
  });

  describe('links between the pages (#2091)', () => {
    it('links a city page back to the index', async () => {
      mockGet.mockResolvedValue(snapshot(page));

      const { body } = await respond('/eat/berlin');

      expect(body).toContain(
        '<a href="https://bitetribe.app/eat">More cities →</a>',
      );
      expect(body).toContain(
        '<a href="https://bitetribe.app/eat">All cities</a>',
      );
    });

    it('links a city page to its posts, and to none it does not have', async () => {
      mockGet.mockResolvedValue(
        snapshot({
          ...page,
          facebookPostUrl: 'https://www.facebook.com/bitetribeapp/posts/1',
        }),
      );

      const { body } = await respond('/eat/berlin');

      expect(body).toContain(
        '<p class="posts">See the post on <a href="https://www.facebook.com/bitetribeapp/posts/1" rel="noopener">Facebook</a></p>',
      );
      expect(body).not.toContain('>Instagram</a>');
    });

    it('shows no post line on a page without posts', async () => {
      mockGet.mockResolvedValue(snapshot(page));

      const { body } = await respond('/eat/berlin');

      expect(body).not.toContain('See the post on');
    });
  });
});
