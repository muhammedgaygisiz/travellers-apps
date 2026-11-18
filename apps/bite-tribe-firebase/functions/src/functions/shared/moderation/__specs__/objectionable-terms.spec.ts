import {
  findObjectionableTerm,
  normalizeForMatching,
} from '../objectionable-terms';

describe('normalizeForMatching', () => {
  it('lower-cases, drops accents and reads look-alike digits as letters', () => {
    expect(normalizeForMatching('Hurensöhne')).toBe('hurensohne');
    expect(normalizeForMatching('C-U-N-T!!')).toBe('c u n t');
    expect(normalizeForMatching('cvnt 4ll d4y')).toBe('cvnt all day');
  });
});

describe('findObjectionableTerm', () => {
  it('finds a listed term as a whole word, in any case or spelling trick', () => {
    expect(findObjectionableTerm('What a CUNT')).toBe('cunt');
    expect(findObjectionableTerm('kanaken food')).toBe('kanaken');
    expect(findObjectionableTerm('Hurensöhne!')).toBe('hurensohne');
  });

  it('finds a phrase as consecutive words', () => {
    expect(findObjectionableTerm('just kill   yourself.')).toBe(
      'kill yourself',
    );
    expect(findObjectionableTerm('kill the yourself')).toBeUndefined();
  });

  it('leaves words that only contain a term, and ordinary food words', () => {
    expect(findObjectionableTerm('Scunthorpe pudding')).toBeUndefined();
    expect(findObjectionableTerm('Meatballs with buns')).toBeUndefined();
    expect(
      findObjectionableTerm('Coq au vin, service en retard'),
    ).toBeUndefined();
    expect(findObjectionableTerm('this burger is the shit')).toBeUndefined();
  });

  it('finds nothing in empty or symbol-only text', () => {
    expect(findObjectionableTerm('')).toBeUndefined();
    expect(findObjectionableTerm('!!! ???')).toBeUndefined();
  });
});
