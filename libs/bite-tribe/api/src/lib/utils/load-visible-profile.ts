import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { PublicUser } from 'model';
import { USERS_COLLECTION } from './user-collection-key';

/**
 * What another account knows of a private profile: its uid, and that it is
 * private. Nothing else, because the rules hand out nothing else (issue #1863).
 *
 * Every surface that renders somebody else's profile already treats
 * `public !== true` as anonymous, so a stand-in shaped like a profile keeps
 * those surfaces on the path they take for a private account today, rather
 * than on the error path an unreadable document would send them down.
 */
export const privateProfileStandIn = (userId: string): PublicUser => ({
  userId,
  public: false,
  displayName: '',
  email: '',
  photoUrl: '',
});

/**
 * Whether a Firestore read failed because the rules refused it.
 *
 * Matched on text, as elsewhere in this repository: the Capacitor bridge does
 * not carry the error's `code` the same way on every platform, and the web SDK
 * says `permission-denied` where the native ones say `PERMISSION_DENIED` or
 * "Missing or insufficient permissions".
 */
export const isRefusedRead = (error: unknown): boolean => {
  const code = (error as { code?: unknown } | null)?.code;
  const described = `${typeof code === 'string' ? code : ''} ${
    error instanceof Error ? error.message : String(error)
  }`.toLowerCase();

  return (
    described.includes('permission-denied') ||
    described.includes('permission_denied') ||
    described.includes('insufficient permissions')
  );
};

/**
 * Another account's profile document as the signed-in member may see it.
 *
 * A public profile comes back whole. A private one is refused by the rules
 * since issue #1863 and comes back as {@link privateProfileStandIn}. A profile
 * that does not exist comes back as `undefined`. Any other failure is the
 * caller's to handle, as it was before.
 */
export const loadVisibleProfile = async (
  userId: string,
): Promise<PublicUser | undefined> => {
  try {
    const result = await FirebaseFirestore.getDocument({
      reference: `${USERS_COLLECTION}/${userId}`,
    });

    const data = result.snapshot?.data;

    return data ? ({ ...data, userId } as unknown as PublicUser) : undefined;
  } catch (error) {
    if (isRefusedRead(error)) {
      return privateProfileStandIn(userId);
    }

    throw error;
  }
};
