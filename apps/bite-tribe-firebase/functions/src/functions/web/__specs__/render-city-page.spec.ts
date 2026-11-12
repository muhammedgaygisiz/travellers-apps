import { Timestamp } from 'firebase-admin/firestore';
import {
  MISSING_CACHE_CONTROL,
  PUBLISHED_CACHE_CONTROL,
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

type Res = { status: jest.Mock; send: jest.Mock; set: jest.Mock };
type Handler = (req: { path: string }, res: Res) => Promise<void>;

const handler = renderCityPage as unknown as Handler;

const respond = async (
  path: string,
): Promise<{
  status: number;
  body: string;
  headers: Record<string, string>;
}> => {
  const res: Res = { status: jest.fn(), send: jest.fn(), set: jest.fn() };
  res.status.mockReturnValue(res);

  await handler({ path }, res);

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
  slug: 'best-sushi',
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
  afterEach(() => jest.clearAllMocks());

  it('renders a published page as a complete document', async () => {
    mockGet.mockResolvedValue(snapshot(page));

    const { status, body, headers } = await respond('/eat/berlin/best-sushi');

    expect(mockDoc).toHaveBeenCalledWith('best-sushi');
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

  it('declares its canonical on bitetribe.app', async () => {
    mockGet.mockResolvedValue(snapshot(page));

    const { body } = await respond('/eat/berlin/best-sushi');

    expect(body).toContain(
      '<link rel="canonical" href="https://bitetribe.app/eat/berlin/best-sushi" />',
    );
    expect(body).not.toContain('bite-tribe.web.app');
  });

  it('does not redirect and carries no executable script', async () => {
    mockGet.mockResolvedValue(snapshot(page));

    const { body } = await respond('/eat/berlin/best-sushi');

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

    const { body } = await respond('/eat/berlin/best-sushi');

    expect(body).not.toContain('<script>');
    expect(body).not.toMatch(/<\/script>[^\n]*<\/script>/);
    expect(body).toContain('&lt;&gt;&amp;&#039;&quot;&quot;');
    // Inside the JSON-LD the crafted name cannot close the element.
    expect(jsonLd(body).itemListElement[0].item.hasMenu.hasMenuItem.name).toBe(
      crafted,
    );
  });

  it.each([
    ['an unknown slug', undefined, '/eat/berlin/best-sushi'],
    ['a draft', { ...page, status: 'draft' }, '/eat/berlin/best-sushi'],
    ['the wrong city', page, '/eat/hamburg/best-sushi'],
  ])('answers %s with 404', async (_case, data, path) => {
    mockGet.mockResolvedValue(snapshot(data));

    const { status, headers } = await respond(path);

    expect(status).toBe(404);
    expect(headers['Cache-Control']).toBe(MISSING_CACHE_CONTROL);
  });

  it.each(['/eat', '/eat/berlin', '/eat/berlin/best-sushi/extra', '/s/x/y'])(
    'answers the malformed path %s with 404 without reading Firestore',
    async (path) => {
      const { status } = await respond(path);

      expect(status).toBe(404);
      expect(mockGet).not.toHaveBeenCalled();
    },
  );

  it('answers a withdrawn page with 410', async () => {
    mockGet.mockResolvedValue(snapshot({ ...page, status: 'withdrawn' }));

    const { status, body } = await respond('/eat/berlin/best-sushi');

    expect(status).toBe(410);
    expect(body).toBe('Gone');
  });

  describe('structured data', () => {
    it('declares an ItemList of restaurants carrying each dish, in order', async () => {
      mockGet.mockResolvedValue(snapshot(page));

      const data = jsonLd((await respond('/eat/berlin/best-sushi')).body);

      expect(data).toMatchObject({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'The best sushi in Berlin',
        url: 'https://bitetribe.app/eat/berlin/best-sushi',
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

      const { body } = await respond('/eat/berlin/best-sushi');

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
          doc('best-sushi', {
            ...page,
            publishedAt: new Timestamp(Date.UTC(2026, 10, 12)),
          }),
          doc('brunch', { ...page, city: 'hamburg' }),
        ],
      });

      const { status, body, headers } = await respond('/eat/sitemap.xml');

      expect(mockWhere).toHaveBeenCalledWith('status', '==', 'published');
      expect(mockGet).not.toHaveBeenCalled();
      expect(status).toBe(200);
      expect(headers['Content-Type']).toBe('application/xml; charset=utf-8');
      expect(body).toContain(
        '<loc>https://bitetribe.app/eat/berlin/best-sushi</loc>\n    <lastmod>2026-11-12</lastmod>',
      );
      expect(body).toContain(
        '<loc>https://bitetribe.app/eat/hamburg/brunch</loc>',
      );
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
});
