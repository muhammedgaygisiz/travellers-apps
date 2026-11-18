/**
 * The first half of the content check (issue #1610): terms that are
 * objectionable in any sentence a food app could hold, so finding one refuses
 * the text without asking the model.
 *
 * **Deliberately short and deliberately severe.** Everything ambiguous is left
 * to the model, which reads the sentence: food words that double as slang
 * ("balls", "buns", "nuts", "cock" as in coq au vin), casual swearing in a
 * review ("this burger is the shit"), and anything whose meaning depends on
 * who is addressed. A blocklist that refused those would refuse ordinary
 * Bites, and a false refusal costs a member a post with no way to appeal.
 *
 * A term matches as a whole word after {@link normalizeForMatching}, never as
 * a substring, so "Scunthorpe" and "assassin" stay out of it. A phrase matches
 * as consecutive words. Words that are ordinary in another language are left
 * out for the same reason: "retard" is French for a delay, "fag" British for a
 * cigarette.
 *
 * Grouped by language for review only; every term is matched against every
 * text, because a member's app language says nothing about the language they
 * write in.
 */
const TERMS_BY_LANGUAGE: Record<string, readonly string[]> = {
  en: [
    'nigger',
    'niggers',
    'nigga',
    'niggas',
    'faggot',
    'faggots',
    'kike',
    'kikes',
    'spic',
    'spics',
    'gook',
    'gooks',
    'wetback',
    'wetbacks',
    'raghead',
    'ragheads',
    'tranny',
    'trannies',
    'cunt',
    'cunts',
    'motherfucker',
    'motherfuckers',
    'cocksucker',
    'cocksuckers',
    'blowjob',
    'handjob',
    'cumshot',
    'gangbang',
    'child porn',
    'kill yourself',
    'kys',
    'heil hitler',
    'sieg heil',
  ],
  de: [
    'neger',
    'kanake',
    'kanaken',
    'schwuchtel',
    'schwuchteln',
    'fotze',
    'fotzen',
    'hurensohn',
    'hurensöhne',
    'missgeburt',
    'judensau',
  ],
  es: [
    'maricón',
    'maricones',
    'sudaca',
    'sudacas',
    'hijo de puta',
    'malparido',
  ],
  fr: ['pédé', 'pédés', 'bougnoule', 'bougnoules', 'enculé', 'enculés'],
  it: ['frocio', 'froci', 'negro di merda', 'figlio di puttana'],
  pt: ['viado', 'viados', 'filho da puta', 'arrombado'],
  tr: ['orospu çocuğu', 'amına koyayım', 'ibne'],
};

/** Digits and symbols used in place of letters to dodge a list like this one. */
const LOOKALIKES: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '@': 'a',
  $: 's',
};

/**
 * Lower case, accents removed, look-alike digits read as letters, and every
 * run of anything that is not a letter turned into one space. The terms go
 * through the same function, so "Hurensöhne" and "hurensohne" are one entry.
 */
export const normalizeForMatching = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[013457@$]/g, (character) => LOOKALIKES[character] ?? character)
    .replace(/[^\p{L}]+/gu, ' ')
    .trim();

const NORMALIZED_TERMS: readonly string[] = [
  ...new Set(
    Object.values(TERMS_BY_LANGUAGE)
      .flat()
      .map(normalizeForMatching)
      .filter(Boolean),
  ),
];

/**
 * The first listed term `text` contains as whole words, or `undefined`.
 * Padding both sides with a space is what turns a substring test into a
 * whole-word one on the normalized text.
 */
export const findObjectionableTerm = (text: string): string | undefined => {
  const normalized = ` ${normalizeForMatching(text)} `;

  if (normalized.trim() === '') {
    return undefined;
  }

  return NORMALIZED_TERMS.find((term) => normalized.includes(` ${term} `));
};
