import {
  markUserMetadataUpdated,
  shouldUpdateUserMetadata,
  USER_METADATA_UPDATE_INTERVAL_MS,
} from '../user-metadata-throttle';
import { Preferences } from '@capacitor/preferences';

jest.mock('@capacitor/preferences', () => ({
  Preferences: { get: jest.fn(), set: jest.fn() },
}));

const get = Preferences.get as jest.Mock;
const set = Preferences.set as jest.Mock;

describe('user metadata throttle', () => {
  afterEach(() => jest.clearAllMocks());

  describe('shouldUpdateUserMetadata', () => {
    it('updates when there is no stored timestamp', async () => {
      get.mockResolvedValue({ value: null });

      await expect(shouldUpdateUserMetadata('user-1')).resolves.toBe(true);
      expect(get).toHaveBeenCalledWith({
        key: 'user-metadata-updated:user-1',
      });
    });

    it('does not update within the interval', async () => {
      get.mockResolvedValue({ value: String(Date.now() - 1_000) });

      await expect(shouldUpdateUserMetadata('user-1')).resolves.toBe(false);
    });

    it('updates once the interval has elapsed', async () => {
      get.mockResolvedValue({
        value: String(Date.now() - USER_METADATA_UPDATE_INTERVAL_MS - 1),
      });

      await expect(shouldUpdateUserMetadata('user-1')).resolves.toBe(true);
    });

    it('updates when the stored value is not a number', async () => {
      get.mockResolvedValue({ value: 'not-a-number' });

      await expect(shouldUpdateUserMetadata('user-1')).resolves.toBe(true);
    });

    it('updates when the throttle state cannot be read', async () => {
      get.mockRejectedValue(new Error('storage unavailable'));

      await expect(shouldUpdateUserMetadata('user-1')).resolves.toBe(true);
    });
  });

  describe('markUserMetadataUpdated', () => {
    it('persists the current timestamp for the user', async () => {
      const now = 1_700_000_000_000;
      jest.spyOn(Date, 'now').mockReturnValue(now);
      set.mockResolvedValue(undefined);

      await markUserMetadataUpdated('user-1');

      expect(set).toHaveBeenCalledWith({
        key: 'user-metadata-updated:user-1',
        value: String(now),
      });
    });

    it('swallows write failures', async () => {
      set.mockRejectedValue(new Error('storage unavailable'));

      await expect(markUserMetadataUpdated('user-1')).resolves.toBeUndefined();
    });
  });
});
