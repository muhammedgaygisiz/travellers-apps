import type { FakeFirestore } from '../../users/__specs__/fake-firestore';
import { createFakeFirestore } from '../../users/__specs__/fake-firestore';

let db: FakeFirestore;

jest.mock('firebase-admin/firestore', () => {
  class Timestamp {
    constructor(private readonly ms: number) {}
    static now(): Timestamp {
      return new Timestamp(1_700_000_000_000);
    }
    toMillis(): number {
      return this.ms;
    }
    toDate(): Date {
      return new Date(this.ms);
    }
  }

  return {
    getFirestore: (): FakeFirestore => db,
    Timestamp,
    FieldValue: { serverTimestamp: (): unknown => Timestamp.now() },
  };
});

jest.mock('firebase-functions', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('firebase-functions/https', () => ({
  HttpsError: class HttpsError extends Error {
    constructor(
      public code: string,
      message: string,
    ) {
      super(message);
    }
  },
}));

jest.mock('../../shared/callable-options', () => ({
  onAppCheck: jest.fn((handler) => handler),
}));

import { logger } from 'firebase-functions';
import {
  listLandingPagesHandler,
  previewLandingPageHandler,
  saveLandingPageHandler,
  setLandingPageStatusHandler,
} from '../landing-pages-as-operator';

interface TestRequest {
  auth?: { uid: string; token: { roles?: unknown } };
  data: unknown;
}

type AnyHandler = (request: never) => Promise<unknown>;

const call = <H extends AnyHandler>(
  handler: H,
  data: unknown,
  roles: unknown = ['admin'],
  signedIn = true,
): ReturnType<H> =>
  handler(
    (signedIn
      ? { auth: { uid: 'admin-uid', token: { roles } }, data }
      : { data }) as TestRequest as never,
  ) as ReturnType<H>;

const bite = (
  n: number,
  extra: Record<string, unknown> = {},
): Record<string, unknown> => ({
  name: `Dish ${n}`,
  place: `Place ${n}`,
  city: 'Berlin',
  userId: 'poster',
  imagePath: `https://example.test/${n}.jpg`,
  imageStatus: 'uploaded',
  ...extra,
});

const input = (
  over: Record<string, unknown> = {},
): Record<string, unknown> => ({
  city: 'berlin',
  cityName: 'Berlin',
  countryCode: 'de',
  locale: 'en',
  title: 'The best sushi in Berlin',
  metaDescription: 'Five dishes.',
  intro: 'Why these.',
  biteIds: ['b1', 'b2', 'b3'],
  ...over,
});

const operatorLogs = (): unknown[] =>
  (logger.info as jest.Mock).mock.calls
    .map(([, payload]) => payload)
    .filter((payload) => payload?.operatorAction);

describe('landing pages as operator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db = createFakeFirestore();
    for (const n of [1, 2, 3, 4, 5, 6]) {
      db.seed(`bites/b${n}`, bite(n));
    }
  });

  describe('authorization', () => {
    it.each([
      ['listLandingPages', listLandingPagesHandler],
      ['saveLandingPage', saveLandingPageHandler],
      ['previewLandingPage', previewLandingPageHandler],
      ['setLandingPageStatus', setLandingPageStatusHandler],
    ])('%s refuses a caller without the admin role', async (_name, handler) => {
      await expect(
        call(handler as AnyHandler, input(), ['business']),
      ).rejects.toMatchObject({ code: 'permission-denied' });
      await expect(
        call(handler as AnyHandler, input(), [], false),
      ).rejects.toMatchObject({ code: 'unauthenticated' });
      expect(db.exists('landingPages/berlin')).toBe(false);
    });
  });

  describe('saveLandingPage', () => {
    it('creates a draft with a snapshot of each Bite in order', async () => {
      const saved = await call(
        saveLandingPageHandler,
        input({ biteIds: ['b3', 'b1'] }),
      );

      expect(saved.status).toBe('draft');
      expect(saved.countryCode).toBe('DE');
      const stored = db.read('landingPages/berlin');
      expect(stored?.['items']).toEqual([
        {
          biteId: 'b3',
          name: 'Dish 3',
          imageUrl: 'https://example.test/3.jpg',
          place: 'Place 3',
          locality: 'Berlin',
        },
        {
          biteId: 'b1',
          name: 'Dish 1',
          imageUrl: 'https://example.test/1.jpg',
          place: 'Place 1',
          locality: 'Berlin',
        },
      ]);
      expect(stored?.['biteIds']).toEqual(['b3', 'b1']);
      expect(stored?.['updatedBy']).toBe('admin-uid');
    });

    it('logs one entry naming actor, city and action', async () => {
      await call(saveLandingPageHandler, input());

      expect(operatorLogs()).toEqual([
        expect.objectContaining({
          operatorAction: 'saveLandingPage',
          callerUid: 'admin-uid',
          targetType: 'landingPage',
          targetId: 'berlin',
        }),
      ]);
    });

    it('reopens with its content intact', async () => {
      await call(saveLandingPageHandler, input());

      const [page] = await call(listLandingPagesHandler, {});

      expect(page).toMatchObject({
        ...input(),
        countryCode: 'DE',
        status: 'draft',
      });
    });

    it.each([
      ['a missing Bite', 'b9'],
      ['a Bite without its photo', 'pending'],
    ])('refuses %s by id', async (_case, id) => {
      db.seed('bites/pending', bite(7, { imageStatus: 'pending' }));

      await expect(
        call(saveLandingPageHandler, input({ biteIds: ['b1', id] })),
      ).rejects.toMatchObject({
        code: 'failed-precondition',
        message: expect.stringContaining(id),
      });
    });

    it.each([
      [
        'more than five Bites',
        { biteIds: ['b1', 'b2', 'b3', 'b4', 'b5', 'b6'] },
      ],
      ['a repeated Bite', { biteIds: ['b1', 'b1'] }],
      ['a city with spaces', { city: 'new york' }],
      ['a missing title', { title: ' ' }],
      ['a bad country code', { countryCode: 'DEU' }],
    ])('refuses %s', async (_case, over) => {
      await expect(
        call(saveLandingPageHandler, input(over)),
      ).rejects.toMatchObject({ code: 'invalid-argument' });
    });

    it('holds a published page to the publishing bar', async () => {
      await call(saveLandingPageHandler, input());
      await call(setLandingPageStatusHandler, {
        city: 'berlin',
        status: 'published',
      });

      await expect(
        call(saveLandingPageHandler, input({ biteIds: ['b1', 'b2'] })),
      ).rejects.toMatchObject({ code: 'failed-precondition' });
      expect(db.read('landingPages/berlin')?.['items']).toHaveLength(3);
    });
  });

  describe('setLandingPageStatus', () => {
    it('publishes a page with three to five Bites', async () => {
      await call(saveLandingPageHandler, input());

      const page = await call(setLandingPageStatusHandler, {
        city: 'berlin',
        status: 'published',
      });

      expect(page.status).toBe('published');
      expect(page.publishedAt).toBeDefined();
      expect(operatorLogs()).toContainEqual(
        expect.objectContaining({
          operatorAction: 'setLandingPageStatus',
          callerUid: 'admin-uid',
          targetId: 'berlin',
          details: { from: 'draft', to: 'published' },
        }),
      );
    });

    it('refuses to publish fewer than three Bites', async () => {
      await call(saveLandingPageHandler, input({ biteIds: ['b1', 'b2'] }));

      await expect(
        call(setLandingPageStatusHandler, {
          city: 'berlin',
          status: 'published',
        }),
      ).rejects.toMatchObject({ code: 'failed-precondition' });
      expect(db.read('landingPages/berlin')?.['status']).toBe('draft');
    });

    it('refuses to publish without an intro or meta description', async () => {
      await call(saveLandingPageHandler, input({ intro: '' }));

      await expect(
        call(setLandingPageStatusHandler, {
          city: 'berlin',
          status: 'published',
        }),
      ).rejects.toMatchObject({ code: 'failed-precondition' });
    });

    it('keeps the published snapshot when a Bite is renamed or deleted', async () => {
      await call(saveLandingPageHandler, input());
      await call(setLandingPageStatusHandler, {
        city: 'berlin',
        status: 'published',
      });

      db.seed('bites/b1', bite(1, { name: 'Renamed' }));
      await db.collection('bites').doc('b2').delete();

      const items = db.read('landingPages/berlin')?.['items'];
      expect(items).toHaveLength(3);
      expect(items[0].name).toBe('Dish 1');
      expect(items[1].name).toBe('Dish 2');
    });

    it('withdraws a published page and logs it', async () => {
      await call(saveLandingPageHandler, input());
      await call(setLandingPageStatusHandler, {
        city: 'berlin',
        status: 'published',
      });

      const page = await call(setLandingPageStatusHandler, {
        city: 'berlin',
        status: 'withdrawn',
      });

      expect(page.status).toBe('withdrawn');
      expect(operatorLogs()).toContainEqual(
        expect.objectContaining({
          operatorAction: 'setLandingPageStatus',
          details: { from: 'published', to: 'withdrawn' },
        }),
      );
    });

    it('answers an unknown city with not-found', async () => {
      await expect(
        call(setLandingPageStatusHandler, {
          city: 'nope',
          status: 'published',
        }),
      ).rejects.toMatchObject({ code: 'not-found' });
    });
  });

  describe('previewLandingPage', () => {
    it('renders the page from the editor without writing it', async () => {
      const { html } = await call(previewLandingPageHandler, input());

      expect(html).toContain('<title>The best sushi in Berlin</title>');
      expect(html).toContain('<h2>Dish 1</h2>');
      expect(html).toContain('<h2>Dish 3</h2>');
      expect(db.exists('landingPages/berlin')).toBe(false);
      expect(operatorLogs()).toEqual([]);
    });
  });
});
