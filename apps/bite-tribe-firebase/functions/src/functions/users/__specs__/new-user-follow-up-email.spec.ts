jest.mock('firebase-functions/params', () => ({
  defineSecret: jest.fn((name: string) => ({ name })),
}));

import { createRawMessage } from '../google-workspace-email';
import { renderFollowUpEmail } from '../new-user-follow-up-email';

const SENDER_ADDRESS_ENV = 'GOOGLE_WORKSPACE_SENDER_ADDRESS';

const decode = (raw: string): string =>
  Buffer.from(raw.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString(
    'utf8',
  );

describe('renderFollowUpEmail', () => {
  const picks = {
    bites: [{ id: 'bite-1', name: '<b>Pad Thai</b>', place: 'China Wok' }],
    people: [{ uid: 'creator-1', displayName: 'Leela & Co' }],
  };

  it('escapes user-typed names', () => {
    const { html } = renderFollowUpEmail({
      to: 'new@example.com',
      language: 'en',
      picks,
      unsubscribeToken: 'token-1234567890abcdef',
    });

    expect(html).toContain('&lt;b&gt;Pad Thai&lt;/b&gt;');
    expect(html).toContain('Leela &amp; Co');
    expect(html).not.toContain('<b>Pad Thai</b>');
  });

  it('links every pick back with the campaign and the profile route', () => {
    const { html } = renderFollowUpEmail({
      to: 'new@example.com',
      language: 'en',
      picks,
      unsubscribeToken: 'token-1234567890abcdef',
    });

    expect(html).toContain(
      'https://bitetribe.app/profile/creator-1?utm_source=bitetribe&amp;utm_medium=email&amp;utm_campaign=new_user_follow_up',
    );
    expect(html).toContain(
      'https://bitetribe.app/unsubscribe/token-1234567890abcdef',
    );
  });

  it('leaves out a section with no picks', () => {
    const { html } = renderFollowUpEmail({
      to: 'new@example.com',
      language: 'en',
      picks: { bites: picks.bites, people: [] },
      unsubscribeToken: 'token-1234567890abcdef',
    });

    expect(html).toContain('Dishes worth trying');
    expect(html).not.toContain('Foodies worth following');
  });

  it('puts the one-click unsubscribe headers on the wire', () => {
    const previous = process.env[SENDER_ADDRESS_ENV];
    process.env[SENDER_ADDRESS_ENV] = 'hello@bitetribe.app';

    try {
      const message = decode(
        createRawMessage(
          renderFollowUpEmail({
            to: 'new@example.com',
            language: 'en',
            picks,
            unsubscribeToken: 'token-1234567890abcdef',
          }),
        ),
      );

      expect(message).toContain(
        'List-Unsubscribe: <https://bitetribe.app/unsubscribe/token-1234567890abcdef>\r\n',
      );
      expect(message).toContain(
        'List-Unsubscribe-Post: List-Unsubscribe=One-Click\r\n',
      );
    } finally {
      if (previous === undefined) {
        delete process.env[SENDER_ADDRESS_ENV];
      } else {
        process.env[SENDER_ADDRESS_ENV] = previous;
      }
    }
  });
});
