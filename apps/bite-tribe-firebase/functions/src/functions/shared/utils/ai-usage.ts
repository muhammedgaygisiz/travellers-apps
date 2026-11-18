import type { Firestore } from 'firebase-admin/firestore';

/**
 * One document per user, `aiUsage/{uid}`, counting the model calls of the
 * current UTC day per AI feature (issues #2030, #2106): `{ day, descriptions,
 * explanations }`. Server-only: no client reads or writes it, and
 * `deleteOwnAccount` removes it with the account.
 */
export const AI_USAGE_COLLECTION = 'aiUsage';

/** The counter each AI feature keeps on the user's `aiUsage` document. */
export type AiUsageCounter = 'descriptions' | 'explanations';

/** The app languages, by code, as a model should be told them. */
export const AI_LANGUAGES: Record<string, string> = {
  am: 'Amharic',
  ar: 'Arabic',
  de: 'German',
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  id: 'Indonesian',
  it: 'Italian',
  ja: 'Japanese',
  ko: 'Korean',
  pt: 'Portuguese',
  th: 'Thai',
  tr: 'Turkish',
  zh: 'Chinese',
};

/** A requested app language as one of {@link AI_LANGUAGES}' codes, else `en`. */
export const aiLanguageCode = (value: unknown): string => {
  const code = typeof value === 'string' ? value.trim().toLowerCase() : '';

  return AI_LANGUAGES[code] ? code : 'en';
};

/** The UTC day a call counts against, `YYYY-MM-DD`. */
export const usageDay = (now: number): string =>
  new Date(now).toISOString().slice(0, 10);

/**
 * Counts one call against the user's day for one feature. Returns false,
 * counting nothing, once that feature's limit for the day is used up.
 *
 * A document from an earlier day is replaced rather than merged, so a new day
 * starts every counter at zero, not only the one being taken.
 */
export const takeDailyAllowance = async (
  db: Firestore,
  uid: string,
  counter: AiUsageCounter,
  limit: number,
  now: number = Date.now(),
): Promise<boolean> => {
  const ref = db.collection(AI_USAGE_COLLECTION).doc(uid);
  const day = usageDay(now);

  return db.runTransaction(async (transaction) => {
    const data = (await transaction.get(ref)).data();
    const sameDay = data?.['day'] === day;
    const used = sameDay ? Number(data?.[counter]) || 0 : 0;

    if (used >= limit) {
      return false;
    }

    if (sameDay) {
      transaction.set(ref, { [counter]: used + 1 }, { merge: true });
    } else {
      transaction.set(ref, { day, [counter]: 1 });
    }

    return true;
  });
};

/** Gives back an allowance taken for a call that produced nothing. */
export const returnDailyAllowance = async (
  db: Firestore,
  uid: string,
  counter: AiUsageCounter,
  now: number = Date.now(),
): Promise<void> => {
  const ref = db.collection(AI_USAGE_COLLECTION).doc(uid);
  const day = usageDay(now);

  await db.runTransaction(async (transaction) => {
    const data = (await transaction.get(ref)).data();

    if (data?.['day'] === day && Number(data[counter]) > 0) {
      transaction.set(
        ref,
        { [counter]: Number(data[counter]) - 1 },
        { merge: true },
      );
    }
  });
};
