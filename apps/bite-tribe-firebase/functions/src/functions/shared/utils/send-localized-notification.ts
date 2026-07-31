import { getMessaging } from 'firebase-admin/messaging';
import { logger } from 'firebase-functions';
import { Translate, createTranslate } from '../i18n/translate';
import { buildChunks } from './build-chunks';
import { CHUNK_SIZE } from './chunk-size';
import { cleanupInvalidTokens } from './cleanup-invalid-tokens';
import { getInvalidTokens } from './get-invalid-tokens';
import { getTokensByLanguage } from './get-tokens-by-language';

export interface LocalizedNotification {
  title: string;
  body: string;
}

export interface LocalizedNotificationRequest {
  /** Accounts to notify. Their enabled installations are resolved here. */
  uids: string[];
  /** The payload the app's notification handler routes on. */
  data: Record<string, string>;
  /**
   * Builds the visible copy for one language. Called once per language present
   * among the recipients, never once per token.
   */
  buildMessage: (translate: Translate) => LocalizedNotification;
}

/**
 * Sends one engagement notification to every enabled installation of the given
 * accounts, worded in each recipient's own language (issue \#1200).
 *
 * Every notification trigger goes through here so the localization, chunking,
 * and invalid-token cleanup contract stays in one place instead of being
 * re-implemented per trigger.
 *
 * Returns the number of tokens the notification was addressed to, so callers
 * can log the reach of a send without re-reading the tokens.
 */
export const sendLocalizedNotification = async ({
  uids,
  data,
  buildMessage,
}: LocalizedNotificationRequest): Promise<number> => {
  const groups = await getTokensByLanguage(uids);
  const tokenCount = groups.reduce(
    (total, group) => total + group.tokens.length,
    0,
  );

  if (tokenCount === 0) {
    logger.warn('--- No valid push tokens found, aborting notification');

    return 0;
  }

  for (const group of groups) {
    const { title, body } = buildMessage(createTranslate(group.language));

    logger.info(`--- Sending notification in ${group.language}:`, body);

    for (const chunk of buildChunks(group.tokens, CHUNK_SIZE)) {
      const res = await getMessaging().sendEachForMulticast({
        tokens: chunk,
        notification: { title, body },
        data,
      });

      const invalidTokens = getInvalidTokens(res, chunk);

      logger.info('--- Invalid tokens to clean up:', invalidTokens);
      if (invalidTokens.length > 0) {
        await cleanupInvalidTokens(invalidTokens);
      }
    }
  }

  return tokenCount;
};
