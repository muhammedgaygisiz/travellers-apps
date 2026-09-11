import {
  TOKEN_ALPHABET,
  TOKEN_LENGTH,
  generateTableQrToken,
  scanFieldsOfTable,
} from '../table-qr-tokens';

jest.mock('firebase-functions', () => ({ logger: { info: jest.fn() } }));

jest.mock('firebase-functions/https', () => ({
  HttpsError: class HttpsError extends Error {
    constructor(
      public code: string,
      message: string,
    ) {
      super(message);
    }
  },
}));

jest.mock('../../shared/callable-options', () => ({
  onAppCheck: jest.fn((handler) => handler),
}));

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(),
}));

/**
 * The generator, on its own.
 *
 * What the emulator spec proves is that a token is issued, resolved, rotated
 * and revoked correctly. What it cannot prove is the property the whole design
 * rests on: that a token says nothing about the table it belongs to. That is a
 * claim about the draw rather than about the flow, so it is checked here, where
 * the draw can be repeated thousands of times in milliseconds.
 */
describe('table QR token generation', () => {
  const DRAWS = 5000;

  const draw = (count: number): string[] =>
    Array.from({ length: count }, generateTableQrToken);

  it('draws a token of the documented length from the documented alphabet', () => {
    const pattern = new RegExp(`^[${TOKEN_ALPHABET}]{${TOKEN_LENGTH}}$`);

    for (const token of draw(200)) {
      expect(token).toMatch(pattern);
    }
  });

  /**
   * Crockford base32: no `I`, `L`, `O` or `U`, so nothing in a token can be
   * confused for a `1`, a `0` or another letter when it is read off a printed
   * sheet during a support call. The alphabet is also entirely within the QR
   * alphanumeric set, which is what lets a code encode in alphanumeric mode.
   */
  it('excludes the characters that are misread for one another', () => {
    expect(TOKEN_ALPHABET).not.toMatch(/[ILOU]/);
    expect(TOKEN_ALPHABET).toHaveLength(32);
    expect(TOKEN_ALPHABET).toMatch(/^[0-9A-Z]+$/);
  });

  it('never repeats a token', () => {
    const tokens = draw(DRAWS);

    expect(new Set(tokens).size).toBe(DRAWS);
  });

  /**
   * Non-sequential, which is the acceptance criterion "another token" covers.
   * Consecutive draws share no prefix, so holding the code from table 11 says
   * nothing about the code on table 12.
   */
  it('draws tokens that share no leading characters with their neighbours', () => {
    const tokens = draw(DRAWS);
    const sharedPrefixes = tokens.filter(
      (token, index) => index > 0 && token[0] === tokens[index - 1][0],
    );

    // One character in 32 by chance, so a generator that counted or that
    // seeded from the table would blow straight past this.
    expect(sharedPrefixes.length).toBeLessThan(DRAWS / 8);
  });

  /**
   * Every position varies. A generator that fixed a character - a version
   * prefix, a checksum, a restaurant discriminator - would show up here, and
   * every one of those leaks something about what the token identifies.
   */
  it('varies every character position', () => {
    const tokens = draw(DRAWS);

    for (let position = 0; position < TOKEN_LENGTH; position++) {
      const seen = new Set(tokens.map((token) => token[position]));

      expect(seen.size).toBeGreaterThan(TOKEN_ALPHABET.length / 2);
    }
  });

  /** It takes no input, so there is no table number for it to encode. */
  it('takes no argument', () => {
    expect(generateTableQrToken).toHaveLength(0);
  });
});

/**
 * The fields the token document copies from the table.
 *
 * One mapping, used by the callables that write a token and by the trigger
 * that keeps it in step, so a scan cannot resolve to a room the table left.
 */
describe('scan fields of a table', () => {
  it('copies the room, the label and whether the table is in service', () => {
    expect(
      scanFieldsOfTable({
        roomId: 'terrace',
        label: '12',
        enabled: true,
        seats: 4,
        position: { x: 1, y: 2 },
      }),
    ).toEqual({ roomId: 'terrace', tableLabel: '12', tableEnabled: true });
  });

  /**
   * A table written before a field existed, or by a client that left one out,
   * resolves to an empty string and to "not in service" rather than to
   * `undefined` - Firestore stores the absence differently from the empty
   * value, and a token carrying `undefined` would fail the write.
   */
  it('reads a missing field as absent rather than as undefined', () => {
    expect(scanFieldsOfTable({})).toEqual({
      roomId: '',
      tableLabel: '',
      tableEnabled: false,
    });
  });

  it('treats a non-boolean enabled field as out of service', () => {
    expect(scanFieldsOfTable({ enabled: 'yes' }).tableEnabled).toBe(false);
  });
});
