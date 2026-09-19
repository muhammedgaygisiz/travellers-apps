import { deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { DocumentReference, getFirestore } from 'firebase-admin/firestore';
import { CallableRequest } from 'firebase-functions/https';
import {
  LoadPublicMenuRequest,
  PublicMenuRefused,
  PublicMenuResolved,
  PublicMenuResult,
  loadPublicMenuHandler,
} from '../load-public-menu';

/**
 * A menu read without an account (GitHub issue #1102).
 *
 * The emulator rather than a fake Firestore, for the reason the scan specs give:
 * every claim here is about documents that exist, do not exist, or say something
 * the caller did not write - a restaurant whose assignment lapsed, a menu that
 * was deleted, a menu with categories and nothing in them.
 *
 * The claim that earns this file is the negative one. Issue #1102's criterion is
 * that the public path exposes the menu and **not** restaurant operations data,
 * and the only way to hold that as the restaurant document grows is to assert
 * the absence of its fields rather than to promise it in a comment.
 */
const PROJECT_ID = 'bite-tribe-emulator-tests';

const OWNER = 'restaurant-owner-uid';
const RESTAURANT = 'owned-restaurant';
const MENU = 'menu-1';

const request = (
  restaurantId: unknown,
): CallableRequest<LoadPublicMenuRequest> =>
  ({ data: { restaurantId } }) as never;

const load = (restaurantId: unknown = RESTAURANT): Promise<PublicMenuResult> =>
  loadPublicMenuHandler(request(restaurantId));

const loaded = async (): Promise<PublicMenuResolved> =>
  (await load()) as PublicMenuResolved;

const refused = async (
  restaurantId: unknown = RESTAURANT,
): Promise<PublicMenuRefused> =>
  (await load(restaurantId)) as PublicMenuRefused;

const restaurantRef = (): DocumentReference =>
  getFirestore().collection('restaurants').doc(RESTAURANT);

const menuRef = (): DocumentReference =>
  getFirestore().collection('menus').doc(MENU);

const codeOf = async (call: Promise<unknown>): Promise<string> => {
  try {
    await call;
  } catch (error) {
    return (error as { code?: string }).code ?? String(error);
  }

  return 'no error';
};

const seed = async (): Promise<void> => {
  await restaurantRef().set({
    name: 'Sakura Kitchen',
    image: 'https://example.test/sakura.jpg',
    ownerUserId: OWNER,
    claimStatus: 'claimed',
    menuId: MENU,
    // Everything below is operations data a reader is not entitled to, seeded
    // so the exposure assertion has something real to fail on.
    tableOrdering: { enabled: false, timeZone: 'Europe/Berlin' },
    openingHours: [{ day: 'wednesday', isOpen: true, timeRanges: [] }],
    position: { latitude: 52.52, longitude: 13.405 },
  });

  await menuRef().set({
    id: MENU,
    restaurantId: RESTAURANT,
    currency: 'EUR',
    categories: [
      {
        id: 'category-pizza',
        title: 'Pizza',
        items: [
          {
            id: 'item-margherita',
            name: 'Margherita',
            description: 'Tomato, mozzarella, basil',
            price: 12,
          },
          {
            id: 'item-calzone',
            name: 'Calzone',
            description: 'Folded, filled',
            price: 14,
            isAvailable: false,
          },
        ],
      },
    ],
  });
};

const clear = async (): Promise<void> => {
  const db = getFirestore();

  await Promise.all([
    db.recursiveDelete(db.collection('restaurants')),
    db.recursiveDelete(db.collection('menus')),
  ]);
};

describe('load public menu', () => {
  beforeAll(() => {
    if (!process.env['FIRESTORE_EMULATOR_HOST']) {
      throw new Error(
        'public menu emulator specs require the Firestore emulator.',
      );
    }

    if (!getApps().length) {
      initializeApp({ projectId: PROJECT_ID });
    }
  });

  beforeEach(async () => {
    await clear();
    await seed();
  });

  afterAll(async () => {
    await clear();
    await Promise.all(getApps().map((app) => deleteApp(app)));
  });

  describe('a menu a guest may read', () => {
    it('answers with the restaurant and the menu', async () => {
      const result = await loaded();

      expect(result.restaurant).toEqual({
        id: RESTAURANT,
        name: 'Sakura Kitchen',
        image: 'https://example.test/sakura.jpg',
      });
      expect(result.menu['id']).toBe(MENU);
      expect(result.menu['currency']).toBe('EUR');
    });

    /**
     * The whole reason this is a callable rather than a read rule. The
     * restaurant document carries who owns it, whether the claim was revoked,
     * and the entire table-ordering configuration - and a guest reading a menu
     * is entitled to none of it.
     */
    it('carries no ownership, no ordering configuration and no position', async () => {
      const serialized = JSON.stringify(await loaded());

      expect(serialized).not.toContain(OWNER);
      expect(serialized).not.toContain('ownerUserId');
      expect(serialized).not.toContain('claimStatus');
      expect(serialized).not.toContain('tableOrdering');
      expect(serialized).not.toContain('openingHours');
      expect(serialized).not.toContain('position');
    });

    it('names only the three restaurant fields a reader needs', async () => {
      expect(Object.keys((await loaded()).restaurant).sort()).toEqual([
        'id',
        'image',
        'name',
      ]);
    });

    /**
     * Menu-only mode is the case this endpoint exists for, so being unable to
     * order is emphatically not a reason to refuse. The seeded restaurant has
     * `tableOrdering.enabled: false` throughout this file.
     */
    it('reads a menu-only restaurant like any other', async () => {
      expect((await loaded()).ok).toBe(true);
    });

    /**
     * `Restaurant.menuId` has held both a bare document id and a `menus/{id}`
     * path over the collection's life, which is why the consumer app has
     * normalised it for as long as it has had a menu button. Handing the path
     * shape to `.doc()` names a collection rather than a document, so the read
     * throws and a restaurant with a perfectly good menu reports as having
     * none. Issue #370 prints this address on a sticker, so the answer has to
     * be right for both shapes.
     */
    it('reads a restaurant whose menu is named as a path', async () => {
      await restaurantRef().update({ menuId: `menus/${MENU}` });

      const result = await loaded();

      expect(result.ok).toBe(true);
      expect(result.menu['id']).toBe(MENU);
    });

    /**
     * Weaker than the scan's `menuUnavailable`, and deliberately: a menu whose
     * every dish is off cannot be ordered from and is still worth reading.
     */
    it('reads a menu whose dishes are all marked unavailable', async () => {
      await menuRef().update({
        categories: [
          {
            id: 'category-pizza',
            title: 'Pizza',
            items: [
              { id: 'i', name: 'Margherita', price: 12, isAvailable: false },
            ],
          },
        ],
      });

      expect((await loaded()).ok).toBe(true);
    });

    /** A menu written before issue #1099 renders by id here like any other. */
    it('fills in the ids of a menu that predates them', async () => {
      await menuRef().update({
        categories: [
          { title: 'Pizza', items: [{ name: 'Margherita', price: 12 }] },
        ],
      });

      const categories = (await loaded()).menu['categories'] as {
        id?: string;
        items: { id?: string }[];
      }[];

      expect(categories[0].id).toBeTruthy();
      expect(categories[0].items[0].id).toBeTruthy();
    });

    /**
     * And does not persist them. A public read has no business writing to a
     * restaurant's menu; the owner's next save is what stores the ids.
     */
    it('writes nothing while doing it', async () => {
      await menuRef().update({
        categories: [
          { title: 'Pizza', items: [{ name: 'Margherita', price: 12 }] },
        ],
      });

      await loaded();

      const stored = (await menuRef().get()).data() ?? {};
      const categories = stored['categories'] as { id?: string }[];

      expect(categories[0].id).toBeUndefined();
    });

    /**
     * Absent stays absent. A menu that has never stated its currency renders
     * bare numbers, which a reader can ask about - unlike a symbol the product
     * guessed, which they would believe.
     */
    it('leaves the currency out when the menu states none', async () => {
      await menuRef().update({ currency: '' });

      expect((await loaded()).menu['currency']).toBeUndefined();
    });
  });

  describe('a menu a guest may not read', () => {
    it('refuses a restaurant that does not exist', async () => {
      expect((await refused('no-such-restaurant')).reason).toBe(
        'restaurantNotFound',
      );
    });

    /**
     * An unheld restaurant's menu is whatever was derived from other people's
     * Bites, and publishing that under the restaurant's name states prices
     * nobody there ever confirmed.
     */
    it('refuses a restaurant no business account holds', async () => {
      await restaurantRef().update({ ownerUserId: '' });

      expect((await refused()).reason).toBe('restaurantInactive');
    });

    it('refuses a restaurant whose assignment was revoked', async () => {
      await restaurantRef().update({ claimStatus: 'revoked' });

      expect((await refused()).reason).toBe('restaurantInactive');
    });

    it('refuses a restaurant that names no menu', async () => {
      await restaurantRef().update({ menuId: '' });

      expect((await refused()).reason).toBe('menuMissing');
    });

    it('refuses a menu document that has been deleted', async () => {
      await menuRef().delete();

      expect((await refused()).reason).toBe('menuMissing');
    });

    it('refuses a menu with no categories at all', async () => {
      await menuRef().update({ categories: [] });

      expect((await refused()).reason).toBe('menuEmpty');
    });

    /** Categories with nothing in them are nothing to show. */
    it('refuses a menu whose categories are all empty', async () => {
      await menuRef().update({
        categories: [{ id: 'c', title: 'Pizza', items: [] }],
      });

      expect((await refused()).reason).toBe('menuEmpty');
    });

    /**
     * A client that sent no restaurant is a bug in the caller rather than a
     * menu that cannot be read, so it is an error and not a refusal.
     */
    it('treats a missing restaurantId as a client error', async () => {
      expect(await codeOf(load(''))).toBe('invalid-argument');
      expect(await codeOf(load('   '))).toBe('invalid-argument');
      // Through the handler rather than `load`, whose default argument would
      // substitute a real restaurant for the absent one and test nothing.
      expect(await codeOf(loadPublicMenuHandler({ data: {} } as never))).toBe(
        'invalid-argument',
      );
    });
  });
});
