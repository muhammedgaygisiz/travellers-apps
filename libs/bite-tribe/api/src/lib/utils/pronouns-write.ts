import { FieldValue } from '@capacitor-firebase/firestore';
import type { PublicUser } from 'model';

/**
 * A profile update as it is sent to Firestore: pronouns that are absent from
 * the update are removed from the document (issue #1826).
 *
 * `updateDocument` merges, so leaving the key out would keep whatever was
 * stored and a user could never clear their pronouns. An empty string would be
 * a second way of saying "none" that every reader would have to know about.
 * `FieldValue.delete()` is the Capacitor plugin's own marker, which survives
 * the native bridge; see `saveMenuCurrency` for the same choice.
 */
export const withPronounsWrite = <T extends Pick<PublicUser, 'pronouns'>>(
  update: T,
): Omit<T, 'pronouns'> & { pronouns: string | FieldValue } => ({
  ...update,
  pronouns: update.pronouns || FieldValue.delete(),
});
