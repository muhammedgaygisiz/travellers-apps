import { getFirestore } from 'firebase-admin/firestore';
import { CallableRequest } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { requireMember } from '../shared/roles';
import { recordContentRefusal } from '../shared/moderation/content-refusal';
import { BiteContent, biteContentText, judgeBiteContent } from './bite-content';

export interface CheckBiteContentRequest extends BiteContent {
  /** The Bite being edited; absent when it is being created. */
  biteId?: unknown;
}

export type CheckBiteContentResponse =
  { status: 'allowed' } | { status: 'refused'; field: string };

/**
 * The Bite form's check before it saves (issue #1610).
 *
 * A Bite is still written by the app, because it has to save offline
 * (`RD-QG-1`), and a callable cannot be reached offline. So the check is in
 * two places: this one, which gives an online user the refusal at once and
 * keeps them on the form with their text, and `moderateBiteOnWrite`, which
 * judges every write that reaches the server, this check skipped or not, and
 * undoes the ones that fail.
 *
 * Nothing is written here. A model verdict is kept by `checkContent`, so the
 * trigger does not pay for the same text twice.
 */
export const checkBiteContentHandler = async (
  request: CallableRequest<CheckBiteContentRequest>,
): Promise<CheckBiteContentResponse> => {
  requireMember(request, 'You must be signed in to post a Bite.');
  const data = request.data ?? {};
  const verdict = await judgeBiteContent(getFirestore(), data);

  if (verdict.verdict === 'allowed') {
    return { status: 'allowed' };
  }

  recordContentRefusal({
    uid: request.auth.uid,
    surface: 'bite',
    stage: 'precheck',
    targetId: typeof data.biteId === 'string' ? data.biteId : undefined,
    verdict,
    text: biteContentText(data),
  });

  return { status: 'refused', field: verdict.field };
};

export const checkBiteContent = onAppCheck<
  CheckBiteContentRequest,
  Promise<CheckBiteContentResponse>
>({ timeoutSeconds: 30 }, checkBiteContentHandler);
