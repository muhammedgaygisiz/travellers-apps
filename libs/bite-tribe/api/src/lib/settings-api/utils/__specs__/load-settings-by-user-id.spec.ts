import { loadSettingsByUserId } from '../load-settings-by-user-id';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';

jest.mock('@capacitor-firebase/firestore', () => ({
  FirebaseFirestore: {
    getDocument: jest.fn(),
  },
}));

describe(loadSettingsByUserId.name, () => {
  let getDocumentSpy: jest.SpyInstance;

  beforeEach(async () => {
    getDocumentSpy = jest
      .spyOn(FirebaseFirestore, 'getDocument')
      .mockResolvedValue({
        snapshot: {
          data: {
            theme: 'dark',
            notificationsEnabled: true,
          },
        } as any,
      });
  });

  it('should load settings for user', async () => {
    const settings = await loadSettingsByUserId('user-id');

    expect(getDocumentSpy).toHaveBeenCalledWith({
      reference: 'settings/user-id',
    });
    expect(settings).toEqual({
      theme: 'dark',
      notificationsEnabled: true,
    });
  });
});
