import { createSign } from 'crypto';
import { defineSecret } from 'firebase-functions/params';
import {
  DEFAULT_LANGUAGE,
  SupportedLanguage,
} from '../shared/i18n/supported-languages';
import { createTranslate } from '../shared/i18n/translate';

const GOOGLE_WORKSPACE_PRIVATE_KEY_ENV = 'GOOGLE_WORKSPACE_PRIVATE_KEY';
const GOOGLE_WORKSPACE_CLIENT_EMAIL_ENV = 'GOOGLE_WORKSPACE_CLIENT_EMAIL';
const GOOGLE_WORKSPACE_DELEGATED_USER_ENV = 'GOOGLE_WORKSPACE_DELEGATED_USER';
const GOOGLE_WORKSPACE_SENDER_ADDRESS_ENV = 'GOOGLE_WORKSPACE_SENDER_ADDRESS';

/**
 * The name in front of the address, matching the Firebase Auth template so both
 * verification mails present one identity.
 */
const SENDER_NAME = 'BiteTribe';

// Firebase Functions gen2 only injects a secret into a function's runtime when
// that function declares it via `secrets: [...]`. Every function that sends a
// verification email must spread this array into its options, otherwise these
// values are undefined at runtime and `createJwt` throws.
//
// The sender address is not confidential - it is printed in every mail - but it
// rides the same mechanism so the mail configuration is set, rotated and
// deployed as one unit rather than half secret and half deploy-time param.
export const googleWorkspaceEmailSecrets = [
  defineSecret(GOOGLE_WORKSPACE_PRIVATE_KEY_ENV),
  defineSecret(GOOGLE_WORKSPACE_CLIENT_EMAIL_ENV),
  defineSecret(GOOGLE_WORKSPACE_DELEGATED_USER_ENV),
  defineSecret(GOOGLE_WORKSPACE_SENDER_ADDRESS_ENV),
];

interface GoogleWorkspaceTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

export interface SendVerificationEmailParams {
  to: string;
  verificationLink: string;
  /**
   * The recipient's account language. Omitted or unknown means English, which
   * is what {@link createTranslate} already falls back to: a mail in the wrong
   * language still beats no mail (issue \#1264).
   */
  language?: SupportedLanguage | string;
}

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL_SEND_URL =
  'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
const SCOPE = 'https://www.googleapis.com/auth/gmail.send';

const base64Url = (value: string | Buffer): string => {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};

const getPrivateKey = (): string => {
  return (process.env[GOOGLE_WORKSPACE_PRIVATE_KEY_ENV] || '').replace(
    /\\n/g,
    '\n',
  );
};

const createJwt = (nowSeconds: number): string => {
  const clientEmail = process.env[GOOGLE_WORKSPACE_CLIENT_EMAIL_ENV];
  const delegatedUser = process.env[GOOGLE_WORKSPACE_DELEGATED_USER_ENV];
  const privateKey = getPrivateKey();

  if (!clientEmail || !delegatedUser || !privateKey) {
    throw new Error('Google Workspace email configuration is missing.');
  }

  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = base64Url(
    JSON.stringify({
      iss: clientEmail,
      scope: SCOPE,
      aud: TOKEN_URL,
      exp: nowSeconds + 3600,
      iat: nowSeconds,
      sub: delegatedUser,
    }),
  );
  const unsignedJwt = `${header}.${claim}`;
  const signature = createSign('RSA-SHA256')
    .update(unsignedJwt)
    .sign(privateKey);

  return `${unsignedJwt}.${base64Url(signature)}`;
};

const fetchAccessToken = async (): Promise<string> => {
  const assertion = createJwt(Math.floor(Date.now() / 1000));
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }).toString(),
  });
  const data = (await response.json()) as GoogleWorkspaceTokenResponse;

  if (!response.ok || !data.access_token) {
    throw new Error(
      data.error_description ||
        data.error ||
        'Failed to authenticate Google Workspace email sender.',
    );
  }

  return data.access_token;
};

/**
 * Encodes a header value as an RFC 2047 encoded word when it is not pure ASCII.
 *
 * A header carries raw ASCII only. Once the subject is translated it can hold
 * umlauts, Arabic, Thai or Amharic, and a raw 8-bit header reaches the inbox as
 * mojibake or gets the message rejected outright.
 */
const encodeHeaderValue = (value: string): string =>
  Buffer.byteLength(value, 'utf8') === value.length
    ? value
    : `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;

/**
 * Base64 body lines, wrapped at the 76 characters RFC 2045 allows.
 *
 * The body is sent base64-encoded rather than as raw UTF-8 for the same reason
 * the subject is encoded: the default transfer encoding is 7bit, which the
 * non-English copy is not.
 */
const encodeBody = (html: string): string =>
  (
    Buffer.from(html, 'utf8')
      .toString('base64')
      .match(/.{1,76}/g) ?? []
  ).join('\r\n');

/** Exported for tests: the rendered message is the contract, not the send. */
export const createRawEmail = (
  to: string,
  verificationLink: string,
  language?: SupportedLanguage | string,
): string => {
  // Never the delegated user: which Workspace mailbox performs the Gmail API
  // delegation is infrastructure, and building `From` from it published a
  // personal address to every user who requested a resend (issue \#1265).
  const from = process.env[GOOGLE_WORKSPACE_SENDER_ADDRESS_ENV];

  if (!from) {
    throw new Error('Google Workspace sender address is missing.');
  }

  const translate = createTranslate(language ?? DEFAULT_LANGUAGE);
  const htmlBody = `${translate('emailVerification.body')}<br><br><a href="${verificationLink}">${translate('emailVerification.linkLabel')}</a>`;
  const message = [
    `From: ${SENDER_NAME} <${from}>`,
    `To: ${to}`,
    `Subject: ${encodeHeaderValue(translate('emailVerification.subject'))}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    encodeBody(htmlBody),
  ].join('\r\n');

  return base64Url(message);
};

export const sendGoogleWorkspaceVerificationEmail = async ({
  to,
  verificationLink,
  language,
}: SendVerificationEmailParams): Promise<void> => {
  const accessToken = await fetchAccessToken();
  const response = await fetch(GMAIL_SEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: createRawEmail(to, verificationLink, language),
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `Failed to send Google Workspace verification email (${response.status}): ${body}`,
    );
  }
};
