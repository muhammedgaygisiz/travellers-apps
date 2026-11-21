import { logOperatorAction } from '../../shared/operator-log';
import { linkBiteToMenuItem } from '../link-bite-to-menu-item';

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

jest.mock('../../shared/operator-log', () => ({
  logOperatorAction: jest.fn(),
}));

const DELETE = { __delete__: true };

type DocRef = { path: string };

const docs = new Map<string, Record<string, unknown> | undefined>();
const updateMock = jest.fn();

const firestoreMock = {
  collection: jest.fn((name: string) => ({
    doc: jest.fn((id: string) => ({ path: `${name}/${id}` })),
  })),
  runTransaction: jest.fn((handler) =>
    handler({
      get: jest.fn(async (ref: DocRef) => {
        const data = docs.get(ref.path);

        return {
          exists: data !== undefined,
          data: (): Record<string, unknown> | undefined => data,
        };
      }),
      update: updateMock,
    }),
  ),
};

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => firestoreMock),
  FieldValue: { delete: jest.fn(() => DELETE) },
}));

const request = (
  data: unknown,
  { uid = 'owner-1', roles = ['business'] as unknown } = {},
): never => ({ auth: { uid, token: { roles } }, data }) as never;

const codeOf = async (promise: Promise<unknown>): Promise<string> => {
  try {
    await promise;
  } catch (error) {
    return (error as { code: string }).code;
  }

  throw new Error('Expected the callable to reject, but it resolved.');
};

/**
 * An owner links a guest's Bite to a dish on their menu, or marks it as not
 * on the menu (GitHub issue #2216). The refusals are the point: the Bite rules
 * stay closed to owners, so this callable is the only check there is.
 */
describe('linkBiteToMenuItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    docs.clear();
    docs.set('bites/bite-1', {
      name: 'Carbonara',
      restaurantId: 'restaurant-1',
      userId: 'guest-1',
    });
    docs.set('restaurants/restaurant-1', {
      ownerUserIds: ['owner-1'],
      menuId: 'menu-1',
    });
    docs.set('menus/menu-1', {
      categories: [
        {
          id: 'c1',
          items: [
            { id: 'item-carbonara', variants: [] },
            { id: 'item-pizza', variants: [{ id: 'v-large' }] },
          ],
        },
      ],
    });
  });

  it('links the Bite to a dish on the menu, as the owner', async () => {
    await expect(
      linkBiteToMenuItem(
        request({ biteId: 'bite-1', menuItemId: 'item-carbonara' }),
      ),
    ).resolves.toEqual({ biteId: 'bite-1', menuItemId: 'item-carbonara' });

    expect(updateMock).toHaveBeenCalledWith(
      { path: 'bites/bite-1' },
      {
        menuItemId: 'item-carbonara',
        variantId: DELETE,
        menuItemLinkedBy: 'owner',
        menuLinkDismissed: DELETE,
      },
    );
  });

  it('links a variant of the dish', async () => {
    await linkBiteToMenuItem(
      request({
        biteId: 'bite-1',
        menuItemId: 'item-pizza',
        variantId: 'v-large',
      }),
    );

    expect(updateMock).toHaveBeenCalledWith(
      { path: 'bites/bite-1' },
      expect.objectContaining({
        menuItemId: 'item-pizza',
        variantId: 'v-large',
      }),
    );
  });

  it('marks the Bite as not on the menu, removing a link made before', async () => {
    docs.set('bites/bite-1', {
      ...docs.get('bites/bite-1'),
      menuItemId: 'item-carbonara',
      menuItemLinkedBy: 'verification',
    });

    await expect(
      linkBiteToMenuItem(request({ biteId: 'bite-1', notOnMenu: true })),
    ).resolves.toEqual({ biteId: 'bite-1', notOnMenu: true });

    expect(updateMock).toHaveBeenCalledWith(
      { path: 'bites/bite-1' },
      {
        menuLinkDismissed: true,
        menuItemId: DELETE,
        variantId: DELETE,
        menuItemLinkedBy: DELETE,
      },
    );
  });

  it('relinks a Bite verification linked', async () => {
    docs.set('bites/bite-1', {
      ...docs.get('bites/bite-1'),
      menuItemId: 'item-pizza',
      menuItemLinkedBy: 'verification',
    });

    await linkBiteToMenuItem(
      request({ biteId: 'bite-1', menuItemId: 'item-carbonara' }),
    );

    expect(updateMock).toHaveBeenCalled();
  });

  it('records who linked which Bite in the operator trail', async () => {
    await linkBiteToMenuItem(
      request({ biteId: 'bite-1', menuItemId: 'item-carbonara' }),
    );

    expect(logOperatorAction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'linkBiteToMenuItem',
        targetType: 'bite',
        targetId: 'bite-1',
        outcome: 'succeeded',
      }),
    );
  });

  it('admits an operator for any restaurant', async () => {
    await linkBiteToMenuItem(
      request(
        { biteId: 'bite-1', menuItemId: 'item-carbonara' },
        { uid: 'operator-1', roles: ['admin'] },
      ),
    );

    expect(updateMock).toHaveBeenCalled();
  });

  describe('refuses', () => {
    afterEach(() => {
      expect(updateMock).not.toHaveBeenCalled();
      expect(logOperatorAction).not.toHaveBeenCalled();
    });

    it('a caller without the business or admin role', async () => {
      expect(
        await codeOf(
          linkBiteToMenuItem(
            request(
              { biteId: 'bite-1', menuItemId: 'item-carbonara' },
              { roles: [] },
            ),
          ),
        ),
      ).toBe('permission-denied');
    });

    it("a business account that does not hold the Bite's restaurant", async () => {
      expect(
        await codeOf(
          linkBiteToMenuItem(
            request(
              { biteId: 'bite-1', menuItemId: 'item-carbonara' },
              { uid: 'other-owner' },
            ),
          ),
        ),
      ).toBe('permission-denied');
    });

    it("a dish that is not on the restaurant's menu", async () => {
      expect(
        await codeOf(
          linkBiteToMenuItem(
            request({ biteId: 'bite-1', menuItemId: 'item-elsewhere' }),
          ),
        ),
      ).toBe('invalid-argument');
    });

    it('a variant the dish does not have', async () => {
      expect(
        await codeOf(
          linkBiteToMenuItem(
            request({
              biteId: 'bite-1',
              menuItemId: 'item-carbonara',
              variantId: 'v-large',
            }),
          ),
        ),
      ).toBe('invalid-argument');
    });

    it.each([
      ['an order or the menu, before the source was recorded', undefined],
      ['the guest, recorded as such', 'guest'],
    ])('a Bite the guest linked from %s', async (_, source) => {
      docs.set('bites/bite-1', {
        ...docs.get('bites/bite-1'),
        menuItemId: 'item-pizza',
        ...(source ? { menuItemLinkedBy: source } : {}),
      });

      expect(
        await codeOf(
          linkBiteToMenuItem(request({ biteId: 'bite-1', notOnMenu: true })),
        ),
      ).toBe('failed-precondition');
    });

    it('a Bite that names no restaurant', async () => {
      docs.set('bites/bite-1', { name: 'Carbonara' });

      expect(
        await codeOf(
          linkBiteToMenuItem(
            request({ biteId: 'bite-1', menuItemId: 'item-carbonara' }),
          ),
        ),
      ).toBe('failed-precondition');
    });

    it('a Bite that does not exist', async () => {
      expect(
        await codeOf(
          linkBiteToMenuItem(
            request({ biteId: 'bite-gone', menuItemId: 'item-carbonara' }),
          ),
        ),
      ).toBe('not-found');
    });

    it.each([
      [{ biteId: 'bite-1' }],
      [{ biteId: 'bite-1', menuItemId: 'item-carbonara', notOnMenu: true }],
      [{ biteId: 'bite-1', notOnMenu: true, variantId: 'v-large' }],
      [{ menuItemId: 'item-carbonara' }],
    ])('a request naming %p', async (data) => {
      expect(await codeOf(linkBiteToMenuItem(request(data)))).toBe(
        'invalid-argument',
      );
    });
  });
});
