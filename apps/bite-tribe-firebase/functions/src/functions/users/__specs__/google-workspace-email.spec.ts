jest.mock('firebase-functions/params', () => ({
  defineSecret: jest.fn((name: string) => ({
    name,
    value: jest.fn(() => 'secret-value'),
  })),
}));

import { createRawEmail } from '../google-workspace-email';

const DELEGATED_USER_ENV = 'GOOGLE_WORKSPACE_DELEGATED_USER';
const SENDER_ADDRESS_ENV = 'GOOGLE_WORKSPACE_SENDER_ADDRESS';

/** Undoes the base64url the Gmail API expects, back to the RFC 2822 message. */
const decode = (raw: string): string =>
  Buffer.from(raw.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString(
    'utf8',
  );

const headerOf = (message: string, name: string): string =>
  message
    .split('\r\n')
    .find((line) => line.startsWith(`${name}: `))
    ?.slice(name.length + 2) ?? '';

/** The body is base64 from the blank line on, wrapped at 76 characters. */
const bodyOf = (message: string): string =>
  Buffer.from(
    message.split('\r\n\r\n').slice(1).join('\r\n\r\n').replace(/\r\n/g, ''),
    'base64',
  ).toString('utf8');

const render = (language?: string): string =>
  decode(
    createRawEmail('user@example.com', 'https://example.com/verify', language),
  );

const restore = (name: string, value: string | undefined): void => {
  if (value === undefined) {
    delete process.env[name];

    return;
  }

  process.env[name] = value;
};

describe('createRawEmail', () => {
  const originalDelegatedUser = process.env[DELEGATED_USER_ENV];
  const originalSenderAddress = process.env[SENDER_ADDRESS_ENV];

  beforeEach(() => {
    // The delegated mailbox and the visible sender are deliberately different
    // here: the whole point of issue \#1265 is that the delegation account must
    // not reach a recipient.
    process.env[DELEGATED_USER_ENV] = 'delegated.person@bitetribe.app';
    process.env[SENDER_ADDRESS_ENV] = 'noreply@bitetribe.app';
  });

  afterAll(() => {
    restore(DELEGATED_USER_ENV, originalDelegatedUser);
    restore(SENDER_ADDRESS_ENV, originalSenderAddress);
  });

  it('sends from the configured sender address, never from the delegated mailbox', () => {
    const message = render('en');

    expect(headerOf(message, 'From')).toBe('BiteTribe <noreply@bitetribe.app>');
    expect(message).not.toContain('delegated.person@bitetribe.app');
  });

  it('renders subject, body and link label in the requested language', () => {
    const message = render('de');

    expect(bodyOf(message)).toContain('Bitte bestätige deine E-Mail-Adresse');
    expect(bodyOf(message)).toContain(
      '<a href="https://example.com/verify">E-Mail-Adresse bestätigen</a>',
    );
    expect(headerOf(message, 'Subject')).toBe(
      `=?UTF-8?B?${Buffer.from(
        'Bestätige deine BiteTribe-E-Mail-Adresse',
        'utf8',
      ).toString('base64')}?=`,
    );
  });

  it('keeps a pure ASCII subject unencoded', () => {
    // The English mail is what shipped; encoding it would change a mail that
    // was already correct.
    expect(headerOf(render('en'), 'Subject')).toBe(
      'Verify your BiteTribe email address',
    );
  });

  it('falls back to English without a language', () => {
    expect(bodyOf(render())).toContain('Please verify your email address');
  });

  it('falls back to English for a language the catalog does not cover', () => {
    expect(bodyOf(render('kl'))).toContain('Please verify your email address');
  });

  it('survives a language whose script needs more than one byte per character', () => {
    // Thai in a 7bit body would reach the inbox as mojibake, so the body is
    // declared and encoded as base64.
    const message = render('th');

    expect(headerOf(message, 'Content-Transfer-Encoding')).toBe('base64');
    expect(bodyOf(message)).toContain('โปรดยืนยันที่อยู่อีเมลของคุณ');
  });

  it('wraps the encoded body at the 76 characters RFC 2045 allows', () => {
    const bodyLines = render('am')
      .split('\r\n\r\n')
      .slice(1)
      .join('\r\n\r\n')
      .split('\r\n');

    bodyLines.forEach((line) => expect(line.length).toBeLessThanOrEqual(76));
  });

  it('fails when the sender address is missing rather than sending from nobody', () => {
    delete process.env[SENDER_ADDRESS_ENV];

    expect(() => render('en')).toThrow(
      'Google Workspace sender address is missing.',
    );
  });

  it('does not fall back to the delegated mailbox when the sender address is unset', () => {
    // A fallback would restore exactly the behaviour issue \#1265 reports: the
    // mail would keep sending, from a personal address, unnoticed.
    delete process.env[SENDER_ADDRESS_ENV];

    expect(() => render('en')).toThrow();
  });
});
