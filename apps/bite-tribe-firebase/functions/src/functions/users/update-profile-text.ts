import { FieldValue, Firestore, getFirestore } from 'firebase-admin/firestore';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { requireMember } from '../shared/roles';
import { checkContent } from '../shared/moderation/check-content';
import { recordContentRefusal } from '../shared/moderation/content-refusal';
import { USERS_COLLECTION } from './display-name-utils';

/**
 * The free text a profile publishes to other accounts - real name, city,
 * about and pronouns - is written here rather than by the app (issue #1610),
 * so it is checked first. The rules refuse a client write that changes any of
 * these fields; the display name has its own way in, `claimDisplayName`.
 */

/** The profile fields this callable owns, as the rules list them. */
export const PROFILE_TEXT_FIELDS = [
  'fullName',
  'city',
  'about',
  'pronouns',
] as const;

type ProfileTextField = (typeof PROFILE_TEXT_FIELDS)[number];

/** Pronouns are capped by issue #1826; the rest by what a profile shows. */
export const MAX_PROFILE_TEXT_LENGTH: Record<ProfileTextField, number> = {
  fullName: 100,
  city: 100,
  about: 1000,
  pronouns: 40,
};

export type UpdateProfileTextRequest = Partial<
  Record<ProfileTextField, unknown>
>;

export type UpdateProfileTextResponse =
  { status: 'saved' } | { status: 'refused'; field: string };

const textOf = (value: unknown, field: ProfileTextField): string => {
  if (value === undefined || value === null) {
    return '';
  }

  if (typeof value !== 'string') {
    throw new HttpsError('invalid-argument', `${field} must be text.`);
  }

  const text = value.trim();

  if (text.length > MAX_PROFILE_TEXT_LENGTH[field]) {
    throw new HttpsError(
      'invalid-argument',
      `${field} must be at most ${MAX_PROFILE_TEXT_LENGTH[field]} characters.`,
    );
  }

  return text;
};

/**
 * Writes all four fields, so the callable is the whole text half of a profile
 * save. Pronouns that are empty are removed rather than stored as an empty
 * string, as the app did before (issue #1826).
 */
export const updateProfileTextForUser = async (
  db: Firestore,
  uid: string,
  data: UpdateProfileTextRequest,
): Promise<UpdateProfileTextResponse> => {
  const text = Object.fromEntries(
    PROFILE_TEXT_FIELDS.map((field) => [field, textOf(data[field], field)]),
  ) as Record<ProfileTextField, string>;

  const verdict = await checkContent(
    db,
    PROFILE_TEXT_FIELDS.map((field) => ({ field, value: text[field] })),
  );

  if (verdict.verdict === 'refused') {
    recordContentRefusal({
      uid,
      surface: 'profile',
      stage: 'callable',
      targetId: uid,
      verdict,
      text: PROFILE_TEXT_FIELDS.map((field) => text[field])
        .filter(Boolean)
        .join(' | '),
    });

    return { status: 'refused', field: verdict.field };
  }

  const now = new Date();

  await db
    .collection(USERS_COLLECTION)
    .doc(uid)
    .set(
      {
        fullName: text.fullName,
        city: text.city,
        about: text.about,
        pronouns: text.pronouns || FieldValue.delete(),
        updatedAt: now.toISOString(),
        updatedAtTimestamp: now.getTime(),
      },
      { merge: true },
    );

  return { status: 'saved' };
};

export const updateProfileTextHandler = async (
  request: CallableRequest<UpdateProfileTextRequest>,
): Promise<UpdateProfileTextResponse> => {
  requireMember(request, 'You must be signed in to edit your profile.');

  return updateProfileTextForUser(
    getFirestore(),
    request.auth.uid,
    request.data ?? {},
  );
};

export const updateProfileText = onAppCheck<
  UpdateProfileTextRequest,
  Promise<UpdateProfileTextResponse>
>({ timeoutSeconds: 30 }, updateProfileTextHandler);
