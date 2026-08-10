import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { PublicUser } from 'model';
import { USERS_COLLECTION } from '../../utils/user-collection-key';

/**
 * The BiteTribe display names of the given accounts, keyed by uid.
 *
 * This exists because the Firebase Auth user is the wrong source for a name
 * that gets published. Its `displayName` comes from the Google or Apple
 * sign-in and holds the person's legal name; the name the product means is the
 * one claimed during onboarding and kept on the user document. Attributing a
 * review to the first of those published a real name to every reader (issue
 * #1308).
 *
 * Uids are deduplicated before reading, so a thread in which one person wrote
 * ten messages still costs one document read. A uid that resolves to nothing —
 * a deleted account, or a profile that was never written — is left out of the
 * map rather than defaulting to anything, so the caller decides what an
 * unresolvable author renders as.
 */
export const loadDisplayNamesById = async (
  userIds: string[],
): Promise<Map<string, string>> => {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];

  const entries = await Promise.all(
    uniqueIds.map(async (userId): Promise<[string, string] | undefined> => {
      const displayName = await loadDisplayNameById(userId);

      return displayName ? [userId, displayName] : undefined;
    }),
  );

  return new Map(entries.filter((entry): entry is [string, string] => !!entry));
};

/**
 * The display name on one account's profile, or nothing when the profile
 * cannot be read.
 *
 * A failed read is not an error worth surfacing: it means one name cannot be
 * shown, and a review compartment that renders without it is better than one
 * that does not render at all.
 */
export const loadDisplayNameById = async (
  userId: string,
): Promise<string | undefined> => {
  if (!userId) {
    return undefined;
  }

  try {
    const result = await FirebaseFirestore.getDocument({
      reference: `${USERS_COLLECTION}/${userId}`,
    });

    const displayName = (result.snapshot?.data as PublicUser | null)
      ?.displayName;

    return displayName?.trim() || undefined;
  } catch (error) {
    console.warn(`Could not read the display name of ${userId}:`, error);

    return undefined;
  }
};
