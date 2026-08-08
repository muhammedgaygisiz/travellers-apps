import { getFirestore } from 'firebase-admin/firestore';
import {
  DEFAULT_LANGUAGE,
  SupportedLanguage,
  normalizeLanguage,
} from '../i18n/supported-languages';

const SETTINGS_COLLECTION = 'settings';

/**
 * Reads the language a user picked in their settings.
 *
 * `settings/{uid}.language` is the same document the settings page writes, so
 * backend-rendered copy follows the choice the user can actually see in the
 * app. A missing document - an account that never opened settings - is not an
 * error; it means the default language.
 *
 * Shared by every surface the app cannot translate itself: push notifications
 * are rendered by the OS (issue \#1200), verification mail by a mail client
 * (issue \#1264). Both have to resolve the recipient's language the same way,
 * or the same account hears from BiteTribe in two languages.
 */
export const getUserLanguage = async (
  uid: string,
): Promise<SupportedLanguage> => {
  const snap = await getFirestore()
    .collection(SETTINGS_COLLECTION)
    .doc(uid)
    .get();

  if (!snap.exists) {
    return DEFAULT_LANGUAGE;
  }

  return normalizeLanguage(snap.data()?.['language']);
};
