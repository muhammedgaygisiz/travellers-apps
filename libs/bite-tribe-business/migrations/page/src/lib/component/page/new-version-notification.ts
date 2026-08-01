import {
  ReleasePlatform,
  SendNewVersionNotificationResult,
} from 'bite-tribe-business/migrations-data-access';

export { type ReleasePlatform };

/**
 * What the last release announcement did, as far as the operator needs to know.
 *
 * A broadcast leaves nothing behind on the page to look at, so the outcome has
 * to be reported explicitly - otherwise pressing the button a second time is
 * the only way to find out whether the first press worked (issue #1194).
 */
export interface NewVersionNotificationState {
  platform: ReleasePlatform;
  status: 'sending' | 'sent' | 'failed';
  result?: SendNewVersionNotificationResult;
}
