import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { createTranslate } from '../shared/i18n/translate';
import { DEFAULT_LANGUAGE } from '../shared/i18n/supported-languages';
import { getUserLanguage } from '../shared/utils/get-user-language';
import {
  googleWorkspaceEmailSecrets,
  sendGoogleWorkspaceEmail,
} from '../users/google-workspace-email';
import { parseRequiredString } from './restaurant-authority';
import {
  EmailVisitSummaryResult,
  USERS_COLLECTION,
  VISIT_SUMMARIES_COLLECTION,
  VisitSummary,
  isSendableAddress,
  refuseEmail,
} from './visit-summary';

/**
 * Mails a guest the summary of one visit, once (GitHub issue #1111).
 *
 * ## The address is used and forgotten
 *
 * `RD-TS-46`. It arrives as an argument, it is handed to the transport, and
 * nothing writes it down - not on the account, not on the summary, not in a
 * log line. That is what makes the flow need no retention rule and no deletion
 * path for a uid nobody can ever sign into again, and it is why the guest is
 * asked at the **end** of the visit rather than at the scan: a question about
 * personal data asked after a meal costs nothing to decline.
 *
 * ## One send per visit, per guest
 *
 * `RD-TS-48`. A callable that mails arbitrary addresses is a spam relay unless
 * something bounds it, and the bound has to be something the caller cannot
 * mint. A rate limit per guest is not that - an anonymous account is free and
 * unlimited (`RD-TS-4`), so an attacker holding one throwaway uid per request
 * is bucketed by nothing. A **visit** is: it exists only because staff seated
 * a party and closed it, and the summary is filed under the uid that was at
 * the table.
 *
 * So the ceiling is the number of meals somebody has actually eaten, and
 * `emailedAt` on the guest's own summary is the counter. A second attempt is
 * refused with `alreadySent` rather than answered as success, because a guest
 * who mistyped an address and taps again is owed the truth: the mail went
 * where they first sent it and nothing here can recall it.
 *
 * ## Why the write comes before the send
 *
 * `emailedAt` is stamped in a transaction that refuses if it is already there,
 * and only then is the mail handed to Gmail. The other order - send, then
 * record - loses the bound the moment the record fails, and two taps racing
 * each other would both find no stamp and both send. Failing after the stamp
 * costs the guest their one send, which is why a failed send clears it again:
 * the stamp means "a mail went out", and when none did it must not stay.
 */

export interface EmailVisitSummaryRequest {
  visitId?: unknown;
  email?: unknown;
}

const uidOf = (request: CallableRequest<unknown>): string => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Sign in to send your summary.');
  }

  return request.auth.uid;
};

/** The lines of the summary, as the mail prints them. */
const rowsOf = (summary: VisitSummary): string =>
  summary.lines
    .map((line) => {
      const name = line.variantName
        ? `${line.name} - ${line.variantName}`
        : line.name;
      const extras = (line.extras ?? []).map((extra) => extra.name).join(', ');

      return [
        '<tr>',
        `<td>${escapeHtml(`${line.quantity} × ${name}`)}`,
        extras ? `<br><small>${escapeHtml(extras)}</small>` : '',
        '</td>',
        `<td align="right">${escapeHtml(
          `${line.lineTotal} ${summary.currency}`,
        )}</td>`,
        '</tr>',
      ].join('');
    })
    .join('');

/**
 * Escapes the values that come from a restaurant's own menu.
 *
 * A dish name is typed by a restaurant owner into the menu editor and reaches
 * this mail unchanged. Nothing else in this codebase renders it into HTML, so
 * nothing else has had to think about it - a dish called `<b>` would otherwise
 * arrive as markup in somebody's inbox.
 */
const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const emailVisitSummaryHandler = async (
  request: CallableRequest<EmailVisitSummaryRequest>,
  now: Date = new Date(),
  send: typeof sendGoogleWorkspaceEmail = sendGoogleWorkspaceEmail,
): Promise<EmailVisitSummaryResult> => {
  const visitId = parseRequiredString(request.data?.visitId, 'visitId');
  const uid = uidOf(request);
  const address = request.data?.email;

  if (!isSendableAddress(address)) {
    return refuseEmail('invalidAddress');
  }

  const firestore = getFirestore();
  const summaryRef = firestore
    .collection(USERS_COLLECTION)
    .doc(uid)
    .collection(VISIT_SUMMARIES_COLLECTION)
    .doc(visitId);
  const at = now.getTime();

  // Claim the one send before making it, so two taps racing each other do not
  // both find an unstamped summary.
  const claimed = await firestore.runTransaction(async (transaction) => {
    const document = await transaction.get(summaryRef);

    if (!document.exists) {
      return refuseEmail('notFound');
    }

    const summary = document.data() as VisitSummary;

    if (typeof summary.emailedAt === 'number') {
      return refuseEmail('alreadySent');
    }

    transaction.update(summaryRef, { emailedAt: at });

    return { ok: true as const, summary };
  });

  if (!claimed.ok) {
    return claimed;
  }

  const { summary } = claimed;
  const translate = createTranslate(
    (await getUserLanguage(uid)) ?? DEFAULT_LANGUAGE,
  );
  const date = new Date(summary.closedAt).toISOString().slice(0, 10);

  try {
    await send({
      to: address.trim(),
      subject: translate('visitSummary.subject', {
        restaurant: summary.restaurantName,
      }),
      html: [
        `<h2>${escapeHtml(translate('visitSummary.heading'))}</h2>`,
        `<p>${escapeHtml(
          translate('visitSummary.intro', {
            restaurant: summary.restaurantName,
            date,
          }),
        )}</p>`,
        '<table width="100%" cellpadding="4" cellspacing="0">',
        rowsOf(summary),
        `<tr><td><strong>${escapeHtml(
          translate('visitSummary.total'),
        )}</strong></td><td align="right"><strong>${escapeHtml(
          `${summary.total} ${summary.currency}`,
        )}</strong></td></tr>`,
        '</table>',
        `<p>${escapeHtml(
          translate(
            summary.paymentStatus === 'settled'
              ? 'visitSummary.settled'
              : 'visitSummary.unsettled',
          ),
        )}</p>`,
        `<p><small>${escapeHtml(
          translate('visitSummary.footnote'),
        )}</small></p>`,
      ].join(''),
    });
  } catch (error) {
    // The stamp means "a mail went out". None did, so it must not stay - the
    // guest keeps the one send they were promised.
    await summaryRef.update({ emailedAt: null }).catch(() => undefined);

    // The address is deliberately absent from this line, as it is from every
    // document. What is worth knowing is which visit failed, not who asked.
    logger.error('visit summary email failed', {
      uid,
      visitId,
      error: error instanceof Error ? error.message : String(error),
    });

    return refuseEmail('sendFailed');
  }

  logger.info('visit summary emailed', { uid, visitId });

  return { ok: true, emailedAt: at };
};

export const emailVisitSummary = onAppCheck<
  EmailVisitSummaryRequest,
  Promise<EmailVisitSummaryResult>
>({ secrets: googleWorkspaceEmailSecrets }, (request) =>
  emailVisitSummaryHandler(request),
);
