import { createSign } from 'crypto';

interface GoogleWorkspaceTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

export interface SendVerificationEmailParams {
  to: string;
  verificationLink: string;
}

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL_SEND_URL =
  'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
const SCOPE = 'https://www.googleapis.com/auth/gmail.send';
const SUBJECT = 'Verify your Bite Tribe email address';
const BODY =
  'Please verify your email address so your Bite Tribe account stays secure and you can receive important account messages.';

const base64Url = (value: string | Buffer): string => {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};

const getPrivateKey = (): string => {
  return (process.env['GOOGLE_WORKSPACE_PRIVATE_KEY'] || '').replace(
    /\\n/g,
    '\n',
  );
};

const createJwt = (nowSeconds: number): string => {
  const clientEmail = process.env['GOOGLE_WORKSPACE_CLIENT_EMAIL'];
  const delegatedUser = process.env['GOOGLE_WORKSPACE_DELEGATED_USER'];
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

const createRawEmail = (to: string, verificationLink: string): string => {
  const from = process.env['GOOGLE_WORKSPACE_DELEGATED_USER'];

  if (!from) {
    throw new Error('Google Workspace delegated sender is missing.');
  }

  const htmlBody = `${BODY}<br><br><a href="${verificationLink}">Verify email address</a>`;
  const message = [
    `From: Bite Tribe <${from}>`,
    `To: ${to}`,
    `Subject: ${SUBJECT}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    '',
    htmlBody,
  ].join('\r\n');

  return base64Url(message);
};

export const sendGoogleWorkspaceVerificationEmail = async ({
  to,
  verificationLink,
}: SendVerificationEmailParams): Promise<void> => {
  const accessToken = await fetchAccessToken();
  const response = await fetch(GMAIL_SEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: createRawEmail(to, verificationLink),
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to send Google Workspace verification email.');
  }
};
