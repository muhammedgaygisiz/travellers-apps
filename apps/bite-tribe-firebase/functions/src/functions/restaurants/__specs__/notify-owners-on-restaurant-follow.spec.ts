const sendMock = jest.fn();
const docGetMock = jest.fn();
const transactionSetMock = jest.fn();
let throttleData: Record<string, unknown> | undefined;

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => ({
    doc: jest.fn((path: string) => ({ path, get: docGetMock })),
    runTransaction: jest.fn(
      async (
        callback: (transaction: {
          get: () => Promise<{ data: () => unknown }>;
          set: jest.Mock;
        }) => Promise<boolean>,
      ): Promise<boolean> =>
        callback({
          get: async (): Promise<{ data: () => unknown }> => ({
            data: (): unknown => throttleData,
          }),
          set: transactionSetMock,
        }),
    ),
  })),
}));

jest.mock('firebase-functions', () => ({
  logger: { info: jest.fn(), warn: jest.fn() },
}));

jest.mock('firebase-functions/firestore', () => ({
  onDocumentCreated: jest.fn((_path, handler) => handler),
}));

jest.mock('../restaurant-authority', () => ({
  RESTAURANT_COLLECTION: 'restaurants',
}));

jest.mock('../../shared/utils/send-localized-notification', () => ({
  sendLocalizedNotification: (...args: unknown[]): unknown => sendMock(...args),
}));

import {
  notifyOwnersOnRestaurantFollow,
  RESTAURANT_FOLLOWER_PUSH_WINDOW_MS,
} from '../notify-owners-on-restaurant-follow';

const NOW = Date.parse('2026-11-24T12:00:00.000Z');
const follow = (userId = 'guest-1'): never =>
  ({ params: { userId, restaurantId: 'r-1' } }) as never;

const restaurant = (data: Record<string, unknown> | undefined): void => {
  docGetMock.mockResolvedValue({ data: () => data });
};

/** GitHub issue #2318. */
describe('notifyOwnersOnRestaurantFollow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
    throttleData = undefined;
    restaurant({
      name: 'Trattoria Roma',
      ownerUserIds: ['owner-1', 'owner-2'],
    });
  });

  afterEach(() => jest.restoreAllMocks());

  it("tells the restaurant's owners, by the restaurant's name only", async () => {
    await notifyOwnersOnRestaurantFollow(follow());

    expect(transactionSetMock).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'restaurantFollowerPushes/r-1' }),
      {
        restaurantId: 'r-1',
        lastSentAt: '2026-11-24T12:00:00.000Z',
        lastSentAtTimestamp: NOW,
      },
    );
    expect(sendMock).toHaveBeenCalledTimes(1);

    const request = sendMock.mock.calls[0][0];
    expect(request.uids).toEqual(['owner-1', 'owner-2']);
    expect(request.data).toEqual({
      type: 'RESTAURANT_NEW_FOLLOWER',
      restaurantId: 'r-1',
    });

    const translate = jest.fn((key: string) => key);
    request.buildMessage(translate);
    expect(translate).toHaveBeenCalledWith('restaurantFollower.title');
    expect(translate).toHaveBeenCalledWith('restaurantFollower.body', {
      restaurant: 'Trattoria Roma',
    });
    expect(JSON.stringify(request)).not.toContain('guest-1');
  });

  it('sends nothing within a day of the last push, and again after it', async () => {
    throttleData = {
      lastSentAtTimestamp: NOW - RESTAURANT_FOLLOWER_PUSH_WINDOW_MS + 1,
    };
    await notifyOwnersOnRestaurantFollow(follow());
    expect(sendMock).not.toHaveBeenCalled();
    expect(transactionSetMock).not.toHaveBeenCalled();

    throttleData = {
      lastSentAtTimestamp: NOW - RESTAURANT_FOLLOWER_PUSH_WINDOW_MS,
    };
    await notifyOwnersOnRestaurantFollow(follow());
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it('leaves out an owner who follows their own restaurant', async () => {
    await notifyOwnersOnRestaurantFollow(follow('owner-1'));

    expect(sendMock.mock.calls[0][0].uids).toEqual(['owner-2']);
  });

  it.each([
    ['a restaurant that is gone', undefined],
    ['a restaurant nobody holds', { name: 'Trattoria Roma' }],
    ['owners that are not ids', { name: 'X', ownerUserIds: [42, ''] }],
    ['an owner following alone', { name: 'X', ownerUserIds: ['guest-1'] }],
  ])('tells nobody, and keeps the day, for %s', async (_case, data) => {
    restaurant(data);

    await notifyOwnersOnRestaurantFollow(follow());

    expect(transactionSetMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('sends an empty name rather than none', async () => {
    restaurant({ ownerUserIds: ['owner-1'] });
    await notifyOwnersOnRestaurantFollow(follow());

    const translate = jest.fn((key: string) => key);
    sendMock.mock.calls[0][0].buildMessage(translate);
    expect(translate).toHaveBeenCalledWith('restaurantFollower.body', {
      restaurant: '',
    });
  });
});
