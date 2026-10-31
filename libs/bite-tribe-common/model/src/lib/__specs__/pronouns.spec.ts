import { normalizePronouns, PRONOUNS_MAX_LENGTH } from '../pronouns';

describe(normalizePronouns.name, () => {
  it('trims the pronouns', () => {
    expect(normalizePronouns('  they/them ')).toBe('they/them');
  });

  it.each([undefined, null, '', '   '])(
    'reads %p as no pronouns at all',
    (pronouns) => {
      expect(normalizePronouns(pronouns)).toBeUndefined();
    },
  );

  it('matches the limit the Firestore rules enforce', () => {
    expect(PRONOUNS_MAX_LENGTH).toBe(40);
  });
});
