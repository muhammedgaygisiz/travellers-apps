import { logger } from 'firebase-functions';
import { ContentVerdict } from './check-content';

/**
 * Where refused content was written (issue #1610). Each is a surface another
 * account reads.
 */
export type ContentSurface =
  'bite' | 'review' | 'reviewReply' | 'displayName' | 'profile';

/** How the refusal was reached: a callable refused it, or a trigger undid it. */
export type ContentRefusalStage = 'precheck' | 'callable' | 'trigger';

export interface ContentRefusal {
  uid: string;
  surface: ContentSurface;
  stage: ContentRefusalStage;
  /** The document the text was meant for, when it had one. */
  targetId?: string;
  /** What the trigger did about content already written. */
  action?: 'refused' | 'reverted' | 'deleted';
  verdict: Extract<ContentVerdict, { verdict: 'refused' }>;
  /** The refused text, cut short: enough for an operator to see the attempt. */
  text: string;
}

/** The one message every refusal is logged under, so one query finds them all. */
export const CONTENT_REFUSED_LOG_MESSAGE = 'content refused';

const MAX_LOGGED_TEXT = 300;

/**
 * Records a refusal so an operator can see what is being attempted.
 *
 * Cloud Logging rather than a collection, by the same decision that made it
 * the audit trail for operator actions (epic #1471): there is no in-app view
 * at this scale, logs are restricted to the project's operators, and they
 * expire on their own, so the refused text is not kept indefinitely. The
 * query is `jsonPayload.message="content refused"`, filtered further by `uid`
 * or `surface`.
 */
export const recordContentRefusal = (refusal: ContentRefusal): void => {
  logger.warn(CONTENT_REFUSED_LOG_MESSAGE, {
    uid: refusal.uid,
    surface: refusal.surface,
    stage: refusal.stage,
    targetId: refusal.targetId,
    action: refusal.action ?? 'refused',
    field: refusal.verdict.field,
    source: refusal.verdict.source,
    reason: refusal.verdict.reason,
    text: refusal.text.slice(0, MAX_LOGGED_TEXT),
  });
};
