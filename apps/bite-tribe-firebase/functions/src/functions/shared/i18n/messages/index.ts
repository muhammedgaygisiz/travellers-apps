import { NotificationMessages } from '../notification-messages';
import { SupportedLanguage } from '../supported-languages';
import { am } from './am';
import { ar } from './ar';
import { de } from './de';
import { en } from './en';
import { es } from './es';
import { fr } from './fr';
import { id } from './id';
import { it } from './it';
import { pt } from './pt';
import { th } from './th';
import { tr } from './tr';

/**
 * Notification copy per supported language.
 *
 * Typed as a full `Record` so adding a language to
 * {@link SupportedLanguage} without its catalog fails the build.
 */
export const NOTIFICATION_MESSAGES: Record<
  SupportedLanguage,
  NotificationMessages
> = { en, de, fr, tr, es, it, ar, am, id, pt, th };
