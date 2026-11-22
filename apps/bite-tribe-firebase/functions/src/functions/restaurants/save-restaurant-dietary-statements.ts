import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { checkContent } from '../shared/moderation/check-content';
import { recordContentRefusal } from '../shared/moderation/content-refusal';
import { logOperatorAction } from '../shared/operator-log';
import {
  parseRequiredString,
  requireRestaurantAuthority,
  RESTAURANT_COLLECTION,
} from './restaurant-authority';
import {
  MAX_CROSS_CONTAMINATION_NOTE_LENGTH,
  RESTAURANT_DIETARY_STATEMENTS,
} from './dietary-statements';

/**
 * What a restaurant says about its whole kitchen (GitHub issue #2194): the
 * fixed dietary statements and a free cross-contamination note.
 *
 * Written here rather than by the business app because the note is free text
 * another account reads, so it is checked first (`RD-UR-11`). The statements
 * travel with it so the restaurant's dietary claim is saved as one decision.
 * The rules refuse a client write of either field, which makes this the only
 * way in; who may call it is `requireRestaurantAuthority`'s answer - an
 * account holding the restaurant, or an operator.
 */

export interface SaveRestaurantDietaryStatementsRequest {
  restaurantId?: unknown;
  statements?: unknown;
  crossContaminationNote?: unknown;
}

export type SaveRestaurantDietaryStatementsResponse =
  { status: 'saved' } | { status: 'refused'; field: string };

const statementsOf = (value: unknown): string[] => {
  if (value === undefined || value === null) {
    return [];
  }

  if (
    !Array.isArray(value) ||
    value.some(
      (entry) =>
        !(RESTAURANT_DIETARY_STATEMENTS as readonly unknown[]).includes(entry),
    )
  ) {
    throw new HttpsError(
      'invalid-argument',
      'statements must be a list of known dietary statements.',
    );
  }

  return RESTAURANT_DIETARY_STATEMENTS.filter((statement) =>
    value.includes(statement),
  );
};

const noteOf = (value: unknown): string => {
  if (value === undefined || value === null) {
    return '';
  }

  if (typeof value !== 'string') {
    throw new HttpsError(
      'invalid-argument',
      'crossContaminationNote must be text.',
    );
  }

  const note = value.trim();

  if (note.length > MAX_CROSS_CONTAMINATION_NOTE_LENGTH) {
    throw new HttpsError(
      'invalid-argument',
      `crossContaminationNote must be at most ${MAX_CROSS_CONTAMINATION_NOTE_LENGTH} characters.`,
    );
  }

  return note;
};

/**
 * Writes both fields. An empty list and an empty note remove their field, so
 * a restaurant that takes its answer back reads as "not stated" again.
 */
export const saveRestaurantDietaryStatementsHandler = async (
  request: CallableRequest<SaveRestaurantDietaryStatementsRequest>,
): Promise<SaveRestaurantDietaryStatementsResponse> => {
  const data = request.data ?? {};
  const restaurantId = parseRequiredString(data.restaurantId, 'restaurantId');
  const statements = statementsOf(data.statements);
  const note = noteOf(data.crossContaminationNote);

  const actingUid = await requireRestaurantAuthority(request, restaurantId);
  const db = getFirestore();

  if (note) {
    const verdict = await checkContent(db, [
      { field: 'crossContaminationNote', value: note },
    ]);

    if (verdict.verdict === 'refused') {
      recordContentRefusal({
        uid: actingUid,
        surface: 'restaurantDietaryNote',
        stage: 'callable',
        targetId: restaurantId,
        verdict,
        text: note,
      });

      return { status: 'refused', field: verdict.field };
    }
  }

  const now = new Date();

  await db
    .collection(RESTAURANT_COLLECTION)
    .doc(restaurantId)
    .update({
      dietaryStatements: statements.length ? statements : FieldValue.delete(),
      crossContaminationNote: note || FieldValue.delete(),
      updatedAt: now.toISOString(),
      updatedAtTimestamp: now.getTime(),
    });

  logOperatorAction(request, {
    action: 'saveRestaurantDietaryStatements',
    targetType: 'restaurant',
    targetId: restaurantId,
    outcome: 'succeeded',
    details: { statements, hasNote: note.length > 0 },
  });

  return { status: 'saved' };
};

export const saveRestaurantDietaryStatements = onAppCheck<
  SaveRestaurantDietaryStatementsRequest,
  Promise<SaveRestaurantDietaryStatementsResponse>
>({ timeoutSeconds: 30 }, saveRestaurantDietaryStatementsHandler);
