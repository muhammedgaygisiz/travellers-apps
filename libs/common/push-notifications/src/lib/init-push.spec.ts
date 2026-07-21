import { PushNotifications } from '@capacitor/push-notifications';
import type { Platform } from '@ionic/angular';
import { hasPushPermission } from './init-push';

// Automocking yields an undefined `PushNotifications`, so stub it explicitly.
jest.mock('@capacitor/push-notifications', () => ({
  PushNotifications: {
    checkPermissions: jest.fn(),
    requestPermissions: jest.fn(),
    register: jest.fn(),
    addListener: jest.fn(),
    removeAllListeners: jest.fn(),
  },
}));
// The module under test pulls Angular and Firebase in through its other
// exports. None of it is reachable from `hasPushPermission`, so stub the
// packages out rather than transforming their ESM for a permission check.
jest.mock('@ionic/angular', () => ({
  NavController: class {},
  Platform: class {},
}));
jest.mock('@capacitor-firebase/firestore', () => ({ FirebaseFirestore: {} }));
jest.mock('@capacitor-firebase/messaging', () => ({ FirebaseMessaging: {} }));
jest.mock('utils', () => ({ PATH: {} }));

/** Only `is()` is consulted, so the rest of Platform stays out of the way. */
const platformStub = (isCapacitor: boolean): Platform =>
  ({ is: jest.fn(() => isCapacitor) }) as unknown as Platform;

describe(hasPushPermission.name, () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('given a device build', () => {
    it('reports the grant without ever prompting', async () => {
      (PushNotifications.checkPermissions as jest.Mock).mockResolvedValue({
        receive: 'granted',
      });

      await expect(hasPushPermission(platformStub(true))).resolves.toBe(true);
      expect(PushNotifications.requestPermissions).not.toHaveBeenCalled();
    });

    it.each(['denied', 'prompt', 'prompt-with-rationale'])(
      'reports no permission when the OS says %s',
      async (receive) => {
        // A stored preference can outlive the OS grant (reinstall, or switching
        // notifications off), so anything short of "granted" reads as dead.
        (PushNotifications.checkPermissions as jest.Mock).mockResolvedValue({
          receive,
        });

        await expect(hasPushPermission(platformStub(true))).resolves.toBe(
          false,
        );
      },
    );

    it('treats a failed check as no permission', async () => {
      jest.spyOn(console, 'warn').mockImplementation();
      (PushNotifications.checkPermissions as jest.Mock).mockRejectedValue(
        new Error('boom'),
      );

      await expect(hasPushPermission(platformStub(true))).resolves.toBe(false);
    });
  });

  describe('given a non-device build', () => {
    it('leaves a stored preference alone, having nothing to check', async () => {
      await expect(hasPushPermission(platformStub(false))).resolves.toBe(true);
      expect(PushNotifications.checkPermissions).not.toHaveBeenCalled();
    });
  });
});
