import type { FakeFirestore } from '../../users/__specs__/fake-firestore';
import { createFakeFirestore } from '../../users/__specs__/fake-firestore';

let db: FakeFirestore;

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: (): FakeFirestore => db,
}));

jest.mock('firebase-functions', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('firebase-functions/https', () => ({
  HttpsError: class extends Error {
    constructor(
      readonly code: string,
      message: string,
    ) {
      super(message);
    }
  },
}));

jest.mock('../../shared/callable-options', () => ({
  onAppCheck: jest.fn((handler: unknown) => handler),
}));

import {
  backfillMenuItemIds,
  backfillMenuItemIdsHandler,
} from '../backfill-menu-item-ids';

interface StoredItem {
  id?: string;
  name?: string;
  price?: number;
  variants?: StoredItem[];
}

interface StoredCategory {
  id?: string;
  title?: string;
  subtitle?: string;
  items?: StoredItem[];
}

const seedMenu = (id: string, categories: StoredCategory[]): void => {
  db.seed(`menus/${id}`, {
    restaurantId: 'china-wok',
    createdAt: '2026-01-04T10:00:00.000Z',
    updatedAt: '2026-01-04T10:00:00.000Z',
    categories,
  });
};

const categoriesOf = (id: string): StoredCategory[] =>
  (db.read(`menus/${id}`)?.['categories'] ?? []) as StoredCategory[];

const idsIn = (categories: StoredCategory[]): string[] =>
  categories.flatMap((category) => [
    category.id ?? '',
    ...(category.items ?? []).flatMap((item) => [
      item.id ?? '',
      ...(item.variants ?? []).map((variant) => variant.id ?? ''),
    ]),
  ]);

describe('backfillMenuItemIds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db = createFakeFirestore();
  });

  it('gives every category, item and variant an id', async () => {
    seedMenu('menu-1', [
      {
        title: 'Pizze',
        items: [
          {
            name: 'Margherita',
            price: 12,
            variants: [{ name: 'Large', price: 16 }],
          },
          { name: 'Calzone', price: 14 },
        ],
      },
    ]);

    const result = await backfillMenuItemIds();

    expect(idsIn(categoriesOf('menu-1')).every(Boolean)).toBe(true);
    expect(result).toEqual({
      processed: 1,
      updated: 1,
      skipped: 0,
      categories: 1,
      items: 3,
    });
  });

  it('gives no two things the same id', async () => {
    seedMenu('menu-1', [
      { title: 'Pizze', items: [{ name: 'Margherita', price: 12 }] },
      { title: 'Dolci', items: [{ name: 'Tiramisu', price: 7 }] },
    ]);

    await backfillMenuItemIds();

    const ids = idsIn(categoriesOf('menu-1'));

    expect(new Set(ids).size).toBe(ids.length);
  });

  /**
   * The acceptance criterion that matters most: replacing an id would move the
   * target of every order line already pointing at it.
   */
  it('leaves an id that already exists exactly where it was', async () => {
    seedMenu('menu-1', [
      {
        id: 'category-pizze',
        title: 'Pizze',
        items: [{ id: 'item-margherita', name: 'Margherita', price: 12 }],
      },
    ]);

    const result = await backfillMenuItemIds();

    expect(idsIn(categoriesOf('menu-1'))).toEqual([
      'category-pizze',
      'item-margherita',
    ]);
    expect(result).toMatchObject({ updated: 0, skipped: 1 });
  });

  it('fills only the half that is missing', async () => {
    seedMenu('menu-1', [
      {
        id: 'category-pizze',
        title: 'Pizze',
        items: [
          { id: 'item-margherita', name: 'Margherita', price: 12 },
          { name: 'Calzone', price: 14 },
        ],
      },
    ]);

    const result = await backfillMenuItemIds();
    const [category] = categoriesOf('menu-1');

    expect(category.id).toBe('category-pizze');
    expect(category.items?.[0].id).toBe('item-margherita');
    expect(category.items?.[1].id).toBeTruthy();
    expect(result).toMatchObject({ categories: 0, items: 1 });
  });

  it('fills a variant whose item already has an id', async () => {
    seedMenu('menu-1', [
      {
        id: 'category-pizze',
        title: 'Pizze',
        items: [
          {
            id: 'item-margherita',
            name: 'Margherita',
            price: 12,
            variants: [{ name: 'Large', price: 16 }],
          },
        ],
      },
    ]);

    const result = await backfillMenuItemIds();
    const [category] = categoriesOf('menu-1');

    expect(category.items?.[0].id).toBe('item-margherita');
    expect(category.items?.[0].variants?.[0].id).toBeTruthy();
    expect(result).toMatchObject({ updated: 1, categories: 0, items: 1 });
  });

  it('runs again without moving anything', async () => {
    seedMenu('menu-1', [
      { title: 'Pizze', items: [{ name: 'Margherita', price: 12 }] },
    ]);

    await backfillMenuItemIds();
    const afterFirst = idsIn(categoriesOf('menu-1'));
    const secondRun = await backfillMenuItemIds();

    expect(idsIn(categoriesOf('menu-1'))).toEqual(afterFirst);
    expect(secondRun).toMatchObject({ updated: 0, skipped: 1 });
  });

  /**
   * An id is not a change the owner made. Touching `updatedAt` would tell every
   * reader the menu was edited on the day an operator pressed a button.
   */
  it('touches no field of the menu other than its categories', async () => {
    seedMenu('menu-1', [
      {
        title: 'Pizze',
        subtitle: 'From the wood oven',
        items: [{ name: 'Margherita', price: 12 }],
      },
    ]);

    await backfillMenuItemIds();

    const stored = db.read('menus/menu-1') ?? {};
    const [category] = categoriesOf('menu-1');

    expect(stored['restaurantId']).toBe('china-wok');
    expect(stored['createdAt']).toBe('2026-01-04T10:00:00.000Z');
    expect(stored['updatedAt']).toBe('2026-01-04T10:00:00.000Z');
    expect(category.title).toBe('Pizze');
    expect(category.subtitle).toBe('From the wood oven');
    expect(category.items?.[0]).toMatchObject({
      name: 'Margherita',
      price: 12,
    });
  });

  it('keeps going past a menu with no categories at all', async () => {
    db.seed('menus/menu-empty', { restaurantId: 'china-wok' });
    seedMenu('menu-1', [
      { title: 'Pizze', items: [{ name: 'Margherita', price: 12 }] },
    ]);

    const result = await backfillMenuItemIds();

    expect(idsIn(categoriesOf('menu-1')).every(Boolean)).toBe(true);
    expect(result).toMatchObject({ processed: 2, updated: 1, skipped: 1 });
  });

  it('reports an empty collection rather than failing', async () => {
    const result = await backfillMenuItemIds();

    expect(result).toEqual({
      processed: 0,
      updated: 0,
      skipped: 0,
      categories: 0,
      items: 0,
    });
  });

  describe('callable', () => {
    const handle = (
      auth: unknown,
    ): ReturnType<typeof backfillMenuItemIdsHandler> =>
      backfillMenuItemIdsHandler({ auth } as unknown as Parameters<
        typeof backfillMenuItemIdsHandler
      >[0]);

    const codeOf = async (promise: Promise<unknown>): Promise<string> => {
      try {
        await promise;
      } catch (error) {
        return (error as { code: string }).code;
      }

      throw new Error('Expected the callable to reject, but it resolved.');
    };

    const callerWith = (roles: unknown): unknown => ({
      uid: 'operator-1',
      token: { roles },
    });

    beforeEach(() => {
      seedMenu('menu-1', [
        { title: 'Pizze', items: [{ name: 'Margherita', price: 12 }] },
      ]);
    });

    it('refuses a caller who is not signed in', async () => {
      expect(await codeOf(handle(undefined))).toBe('unauthenticated');
      expect(idsIn(categoriesOf('menu-1')).every(Boolean)).toBe(false);
    });

    it('refuses a signed-in caller holding no roles', async () => {
      expect(await codeOf(handle(callerWith(undefined)))).toBe(
        'permission-denied',
      );
      expect(idsIn(categoriesOf('menu-1')).every(Boolean)).toBe(false);
    });

    it('refuses a business account', async () => {
      expect(await codeOf(handle(callerWith(['business'])))).toBe(
        'permission-denied',
      );
      expect(idsIn(categoriesOf('menu-1')).every(Boolean)).toBe(false);
    });

    it('runs for an operator', async () => {
      const result = await handle(callerWith(['admin']));

      expect(result).toMatchObject({ processed: 1, updated: 1 });
      expect(idsIn(categoriesOf('menu-1')).every(Boolean)).toBe(true);
    });
  });
});
