const mockGetAll = jest.fn();
const mockCollection = jest.fn();

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: (): object => ({
    doc: (path: string): string => path,
    getAll: (...refs: string[]): Promise<unknown[]> => mockGetAll(...refs),
    collection: (path: string): object => mockCollection(path),
  }),
}));

import { getTokens } from '../get-tokens';

const settingSnapshot = (pushNotifications?: boolean): object => ({
  data: (): { pushNotifications?: boolean } => ({ pushNotifications }),
});

const tokenSnapshot = (
  tokens: Array<{ id: string; enabled?: boolean }>,
): object => ({
  size: tokens.length,
  docs: tokens.map(({ id, enabled }) => ({
    id,
    data: (): { enabled?: boolean } => ({ enabled }),
  })),
});

describe(getTokens.name, () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns immediately when there are no recipients', async () => {
    await expect(getTokens([])).resolves.toEqual([]);
    expect(mockGetAll).not.toHaveBeenCalled();
  });

  it('excludes every token for an explicit product opt-out', async () => {
    mockGetAll.mockResolvedValue([settingSnapshot(false)]);

    await expect(getTokens(['user-off'])).resolves.toEqual([]);
    expect(mockCollection).not.toHaveBeenCalled();
  });

  it('keeps legacy users and filters disabled device tokens', async () => {
    mockGetAll.mockResolvedValue([
      settingSnapshot(undefined),
      settingSnapshot(true),
    ]);
    mockCollection.mockImplementation((path: string) => ({
      get: jest
        .fn()
        .mockResolvedValue(
          path.includes('legacy')
            ? tokenSnapshot([
                { id: 'legacy-enabled' },
                { id: 'legacy-disabled', enabled: false },
              ])
            : tokenSnapshot([{ id: 'opted-in', enabled: true }]),
        ),
    }));

    await expect(getTokens(['legacy-user', 'opted-in-user'])).resolves.toEqual([
      'legacy-enabled',
      'opted-in',
    ]);
  });
});
