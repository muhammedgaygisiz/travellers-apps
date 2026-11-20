import { logger } from 'firebase-functions';

/**
 * Where an image is uploaded (issue #2138). Each is published to accounts
 * other than the uploader's.
 */
export type ImageSurface =
  'bitePhoto' | 'profilePhoto' | 'restaurantPhoto' | 'biteTrailPhoto';

/**
 * Where refused content was written (issues #1610 and #2138). Each is a
 * surface another account reads.
 */
export type ContentSurface =
  'bite' | 'review' | 'reviewReply' | 'displayName' | 'profile' | ImageSurface;

/** Why something was refused, as a check reports it. */
export interface RefusalVerdict {
  /** The field that failed: a text field, `content` or `image`. */
  field: string;
  /** `sample` is the image check's stand-in verdict outside production. */
  source: 'wordlist' | 'model' | 'sample';
  /** The model's category, or the matched term for the wordlist. */
  reason: string;
}

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
  verdict: RefusalVerdict;
  /**
   * The refused text, cut short: enough for an operator to see the attempt.
   * An image refusal has none, and no image data is ever logged.
   */
  text?: string;
  /** The Storage object a refused image was uploaded to. */
  storagePath?: string;
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
    text: refusal.text?.slice(0, MAX_LOGGED_TEXT),
    storagePath: refusal.storagePath,
  });
};
