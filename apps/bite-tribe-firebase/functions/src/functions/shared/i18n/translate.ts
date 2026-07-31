import { NOTIFICATION_MESSAGES } from './messages';
import { NotificationMessageKey } from './notification-messages';
import {
  DEFAULT_LANGUAGE,
  SupportedLanguage,
  normalizeLanguage,
} from './supported-languages';

export type MessageParams = Record<string, string | number>;

/** Renders one notification message in the language it was created for. */
export type Translate = (
  key: NotificationMessageKey,
  params?: MessageParams,
) => string;

const PLACEHOLDER = /{{\s*(\w+)\s*}}/g;

/**
 * Replaces `{{name}}` placeholders, mirroring Transloco's interpolation so the
 * backend catalog reads like the app's locale files. A placeholder without a
 * matching parameter is left in place: an empty gap in a notification hides the
 * mistake, the raw token makes it visible.
 */
const interpolate = (message: string, params?: MessageParams): string =>
  params === undefined
    ? message
    : message.replace(PLACEHOLDER, (placeholder, name: string) => {
        const value = params[name];

        return value === undefined ? placeholder : `${value}`;
      });

/**
 * Binds the catalog to one language.
 *
 * Falls back to {@link DEFAULT_LANGUAGE} for an unknown language rather than
 * failing, because a notification in the wrong language still beats no
 * notification.
 */
export const createTranslate = (
  language: SupportedLanguage | string,
): Translate => {
  const resolved = normalizeLanguage(language);
  const messages = NOTIFICATION_MESSAGES[resolved];
  const fallback = NOTIFICATION_MESSAGES[DEFAULT_LANGUAGE];

  return (key, params) => interpolate(messages[key] ?? fallback[key], params);
};
