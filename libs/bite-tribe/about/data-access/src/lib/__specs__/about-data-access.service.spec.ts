import { TestBed } from '@angular/core/testing';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { AboutDataAccessService } from '../about-data-access.service';

jest.mock('@capacitor-firebase/firestore', () => ({
  FirebaseFirestore: {
    getCountFromServer: jest.fn().mockResolvedValue({ count: 0 }),
    getDocument: jest.fn(),
  },
}));

jest.mock('@capacitor-firebase/functions', () => ({
  FirebaseFunctions: {
    callByName: jest.fn().mockResolvedValue({ data: 0 }),
  },
}));

const settle = async (): Promise<void> => {
  TestBed.tick();
  await new Promise((resolve) => setTimeout(resolve));
  TestBed.tick();
};

describe(AboutDataAccessService.name, () => {
  const createService = (): AboutDataAccessService =>
    TestBed.runInInjectionContext(() => new AboutDataAccessService());

  beforeEach(() => jest.clearAllMocks());

  it('reads the countries with Bites from meta/biteCountries', async () => {
    jest.mocked(FirebaseFirestore.getDocument).mockResolvedValue({
      snapshot: {
        id: 'biteCountries',
        path: 'meta/biteCountries',
        data: { countryCodes: ['DE', 7, 'TR'] },
      },
    } as never);
    const service = createService();

    await settle();

    expect(FirebaseFirestore.getDocument).toHaveBeenCalledWith({
      reference: 'meta/biteCountries',
    });
    expect(service.biteCountriesValue()).toEqual(['DE', 'TR']);
  });

  it('reads no countries when the document does not exist yet', async () => {
    jest.mocked(FirebaseFirestore.getDocument).mockResolvedValue({
      snapshot: { id: 'biteCountries', path: 'meta/biteCountries', data: null },
    } as never);
    const service = createService();

    await settle();

    expect(service.biteCountriesValue()).toEqual([]);
  });

  it('leaves the countries empty when the read fails', async () => {
    jest
      .mocked(FirebaseFirestore.getDocument)
      .mockRejectedValue(new Error('permission-denied'));
    const service = createService();

    await settle();

    expect(service.biteCountries.status()).toBe('error');
    expect(service.biteCountriesValue()).toBeUndefined();
  });
});
