import { randomBytes } from 'crypto';
import { Firestore } from 'firebase-admin/firestore';

/**
 * Unsubscribe tokens, one per mail that carries a link (GitHub issue #1707).
 *
 * The link has to work for a reader who is not signed in, so it cannot carry
 * the uid: anybody who saw a uid could opt that account out. It carries a
 * random token instead, and this collection maps it back. The rules close it
 * to every client; only the Admin SDK reads or writes it.
 */
export const EMAIL_OPT_OUTS_COLLECTION = 'emailOptOuts';

/**
 * The setting that records the opt-out, on `settings/{uid}`.
 *
 * Named for the class of mail rather than for this one, because the next
 * non-transactional mail has to honour the same answer. Transactional mail -
 * verification, a visit summary the guest asked for - ignores it.
 */
export const PRODUCT_EMAILS_SETTING = 'productEmails';

export const createOptOutToken = async (
  db: Firestore,
  uid: string,
  now: Date,
): Promise<string> => {
  const token = randomBytes(24).toString('base64url');

  await db
    .collection(EMAIL_OPT_OUTS_COLLECTION)
    .doc(token)
    .set({ uid, createdAt: now.toISOString() });

  return token;
};

/** The account a token opts out, or nothing for a token nobody issued. */
export const resolveOptOutToken = async (
  db: Firestore,
  token: string,
): Promise<string | undefined> => {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) {
    return undefined;
  }

  const uid = (
    await db.collection(EMAIL_OPT_OUTS_COLLECTION).doc(token).get()
  ).data()?.['uid'];

  return typeof uid === 'string' && uid !== '' ? uid : undefined;
};

export const optOutOfProductEmails = async (
  db: Firestore,
  uid: string,
): Promise<void> => {
  await db
    .collection('settings')
    .doc(uid)
    .set({ [PRODUCT_EMAILS_SETTING]: false }, { merge: true });
};

export const hasOptedOutOfProductEmails = async (
  db: Firestore,
  uid: string,
): Promise<boolean> =>
  (await db.collection('settings').doc(uid).get()).data()?.[
    PRODUCT_EMAILS_SETTING
  ] === false;
