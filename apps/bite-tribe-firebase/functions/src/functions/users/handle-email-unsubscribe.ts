import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onRequest } from 'firebase-functions/https';
import {
  DEFAULT_LANGUAGE,
  SupportedLanguage,
} from '../shared/i18n/supported-languages';
import { createTranslate } from '../shared/i18n/translate';
import { getUserLanguage } from '../shared/utils/get-user-language';
import { escapeHtml } from '../shared/utils/render-html';
import { optOutOfProductEmails, resolveOptOutToken } from './email-opt-out';

/**
 * The page behind a mail's unsubscribe link, at `/unsubscribe/{token}`
 * (GitHub issue #1707).
 *
 * ## A GET never unsubscribes
 *
 * Mail security scanners open every link in a message before the reader does.
 * If opening the link were the opt-out, those scanners would unsubscribe
 * people who never clicked. So a GET only shows a confirmation with a button,
 * and the opt-out is the POST that button sends - which is also the request an
 * RFC 8058 one-click `List-Unsubscribe-Post` makes from the inbox itself.
 *
 * A second POST is answered as done again, because it is.
 */

type Outcome = 'confirm' | 'done' | 'invalid';

const page = (
  language: SupportedLanguage,
  outcome: Outcome,
  action: string,
): string => {
  const translate = createTranslate(language);
  const title = escapeHtml(translate('emailUnsubscribe.title'));
  const body =
    outcome === 'confirm'
      ? `<p>${escapeHtml(translate('emailUnsubscribe.confirm'))}</p>
  <form method="post" action="${escapeHtml(action)}"><button type="submit">${escapeHtml(translate('emailUnsubscribe.button'))}</button></form>`
      : `<p>${escapeHtml(translate(outcome === 'done' ? 'emailUnsubscribe.done' : 'emailUnsubscribe.invalid'))}</p>`;

  return `<!doctype html>
<html lang="${language}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>${title}</title>
</head>
<body style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:48px auto;padding:0 16px">
  <h1 style="font-size:20px">${title}</h1>
  ${body}
</body>
</html>`;
};

/** The token out of `/unsubscribe/{token}`, or an empty string. */
export const tokenFromPath = (path: string): string => {
  const [prefix, token, ...rest] = path.split('/').filter(Boolean);

  return prefix === 'unsubscribe' && token && rest.length === 0 ? token : '';
};

export interface UnsubscribeRequest {
  method: string;
  path: string;
}

export interface UnsubscribeResponse {
  status: number;
  html: string;
}

export const handleEmailUnsubscribeRequest = async ({
  method,
  path,
}: UnsubscribeRequest): Promise<UnsubscribeResponse> => {
  const db = getFirestore();
  const token = tokenFromPath(path);
  const uid = token ? await resolveOptOutToken(db, token) : undefined;

  if (!uid) {
    return { status: 404, html: page(DEFAULT_LANGUAGE, 'invalid', path) };
  }

  const language = await getUserLanguage(uid);

  if (method === 'POST') {
    await optOutOfProductEmails(db, uid);
    logger.info('product emails opted out', { uid });

    return { status: 200, html: page(language, 'done', path) };
  }

  if (method === 'GET' || method === 'HEAD') {
    return { status: 200, html: page(language, 'confirm', path) };
  }

  return { status: 405, html: page(language, 'confirm', path) };
};

export const handleEmailUnsubscribe = onRequest(async (req, res) => {
  try {
    const { status, html } = await handleEmailUnsubscribeRequest({
      method: req.method,
      path: req.path,
    });

    res.set('Cache-Control', 'no-store');
    res.status(status).send(html);
  } catch (error) {
    logger.error('email unsubscribe failed', { error });
    res.status(500).send('Internal Server Error');
  }
});
