jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => 'db'),
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

jest.mock('../../shared/utils/bite-countries', () => ({
  rebuildBiteCountries: jest.fn(async () => ['DE', 'TR']),
}));

import { rebuildBiteCountries } from '../../shared/utils/bite-countries';
import { rebuildBiteCountriesHandler } from '../rebuild-bite-countries';

describe('rebuildBiteCountriesHandler', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects a caller without the admin role', async () => {
    await expect(
      rebuildBiteCountriesHandler({
        auth: { uid: 'member', token: {} },
      } as never),
    ).rejects.toMatchObject({ code: 'permission-denied' });
    expect(rebuildBiteCountries).not.toHaveBeenCalled();
  });

  it('rebuilds the list for an admin and reports how many countries it holds', async () => {
    await expect(
      rebuildBiteCountriesHandler({
        auth: { uid: 'operator', token: { roles: ['admin'] } },
      } as never),
    ).resolves.toEqual({ countries: 2 });
    expect(rebuildBiteCountries).toHaveBeenCalledWith('db');
  });
});
