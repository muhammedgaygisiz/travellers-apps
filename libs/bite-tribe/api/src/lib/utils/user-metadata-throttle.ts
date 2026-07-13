import { Preferences } from '@capacitor/preferences';

export const USER_METADATA_UPDATE_INTERVAL_MS = 24 * 60 * 60 * 1000; // 1 day

const key = (uid: string): string => `user-metadata-updated:${uid}`;

/**
 * `updateUserMetadata` only refreshes the user's `lastSeen`, so it's wasteful to
 * call the Cloud Function on every foreground/login. This throttles it to at
 * most once per day per user, persisted across app restarts.
 */
export const shouldUpdateUserMetadata = async (
  uid: string,
): Promise<boolean> => {
  try {
    const { value } = await Preferences.get({ key: key(uid) });
    if (!value) {
      return true;
    }

    const lastUpdated = Number(value);
    if (!Number.isFinite(lastUpdated)) {
      return true;
    }

    return Date.now() - lastUpdated >= USER_METADATA_UPDATE_INTERVAL_MS;
  } catch {
    // If we can't read the throttle state, err on the side of updating.
    return true;
  }
};

export const markUserMetadataUpdated = async (uid: string): Promise<void> => {
  try {
    await Preferences.set({ key: key(uid), value: String(Date.now()) });
  } catch {
    // Best-effort: a failed write just means we may update again sooner.
  }
};
