import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import {
  DEFAULT_LANGUAGE,
  SupportedLanguage,
  normalizeLanguage,
} from '../i18n/supported-languages';
import { NotificationPlatform } from '../model/notification-platform';
import { UserPushToken, getTokens } from './get-tokens';

const db = getFirestore();

const SETTINGS_COLLECTION = 'settings';

/** The tokens that share one language, ready for a single localized send. */
export interface LocalizedTokens {
  language: SupportedLanguage;
  tokens: string[];
}

/**
 * Reads the language a user picked in their settings.
 *
 * `settings/{uid}.language` is the same document the settings page writes, so
 * the notification follows the choice the user can actually see in the app. A
 * missing document - an account that never opened settings - is not an error;
 * it means the default language.
 */
const getUserLanguage = async (uid: string): Promise<SupportedLanguage> => {
  const snap = await db.collection(SETTINGS_COLLECTION).doc(uid).get();

  if (!snap.exists) {
    return DEFAULT_LANGUAGE;
  }

  return normalizeLanguage(snap.data()?.['language']);
};

/**
 * Narrows the tokens to the installations of one platform.
 *
 * A token whose document predates the `platform` field is left out rather than
 * guessed at: an announcement addressed to iOS must not reach an Android device
 * just because the installation is old (issue \#1194).
 */
const onPlatform = (
  tokens: UserPushToken[],
  platform: NotificationPlatform,
): UserPushToken[] => tokens.filter((token) => token.platform === platform);

/**
 * Collects the enabled push tokens of the given users and groups them by the
 * language each recipient chose.
 *
 * Grouping happens per account rather than per token because the language is an
 * account preference, while `enabled` is per installation (issue \#1184): every
 * installation of the same account gets the same wording.
 *
 * `platform` restricts the send to the installations of one store. Omitting it
 * keeps the default reach of every enabled installation.
 */
export const getTokensByLanguage = async (
  uids: string[],
  platform?: NotificationPlatform,
): Promise<LocalizedTokens[]> => {
  const registered = await getTokens(uids);
  const tokens = platform ? onPlatform(registered, platform) : registered;

  if (platform) {
    logger.info(
      `--- Tokens on ${platform}: ${tokens.length} of ${registered.length}`,
    );
  }

  if (tokens.length === 0) {
    return [];
  }

  // Only accounts that actually have a delivery address are worth a settings
  // read; a fan-out over followers is mostly users without registered tokens.
  const tokenOwners = [...new Set(tokens.map(({ uid }) => uid))];
  const languages = new Map(
    await Promise.all(
      tokenOwners.map(async (uid): Promise<[string, SupportedLanguage]> => [
        uid,
        await getUserLanguage(uid),
      ]),
    ),
  );

  const groups = new Map<SupportedLanguage, string[]>();

  tokens.forEach(({ uid, token }) => {
    const language = languages.get(uid) ?? DEFAULT_LANGUAGE;
    const group = groups.get(language);

    if (group) {
      group.push(token);

      return;
    }

    groups.set(language, [token]);
  });

  logger.info(
    '--- Recipient languages:',
    [...groups.entries()].map(([language, group]) => ({
      language,
      tokens: group.length,
    })),
  );

  return [...groups.entries()].map(([language, group]) => ({
    language,
    tokens: group,
  }));
};
