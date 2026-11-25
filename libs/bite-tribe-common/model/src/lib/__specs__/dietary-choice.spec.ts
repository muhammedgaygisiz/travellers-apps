import {
  DIETARY_CHOICES,
  dietaryChoicesOf,
  hasDietaryConsent,
  isDietaryChoice,
  isSensitiveDietaryChoice,
  LIFESTYLE_DIETARY_CHOICES,
  SENSITIVE_DIETARY_CHOICES,
} from '../dietary-choice';

/** See GitHub issue #2196. */
describe('dietary choices', () => {
  it('is the label vocabulary plus avoiding pork and alcohol', () => {
    expect(DIETARY_CHOICES).toEqual([
      'vegan',
      'vegetarian',
      'pescatarian',
      'alcohol-free',
      'gluten-free',
      'lactose-free',
      'nut-free',
      'halal',
      'kosher',
      'avoids-pork',
      'avoids-alcohol',
    ]);
  });

  it('counts every high-risk label and both avoidances as religion or health', () => {
    expect(SENSITIVE_DIETARY_CHOICES).toEqual([
      'gluten-free',
      'lactose-free',
      'nut-free',
      'halal',
      'kosher',
      'avoids-pork',
      'avoids-alcohol',
    ]);
    expect(LIFESTYLE_DIETARY_CHOICES).toEqual([
      'vegan',
      'vegetarian',
      'pescatarian',
      'alcohol-free',
    ]);
    expect(isSensitiveDietaryChoice('vegan')).toBe(false);
    expect(isSensitiveDietaryChoice('halal')).toBe(true);
  });

  it.each([
    ['avoids-pork', true],
    ['vegan', true],
    ['keto', false],
    ['toString', false],
    [undefined, false],
  ])('knows %p: %p', (value, expected) => {
    expect(isDietaryChoice(value)).toBe(expected);
  });

  it('reads known choices in list order, without repeats', () => {
    expect(
      dietaryChoicesOf({
        dietaryChoices: ['avoids-pork', 'keto', 'vegan', 'vegan', 'halal'],
        dietaryConsentAt: '2026-11-25T10:00:00.000Z',
      }),
    ).toEqual(['vegan', 'halal', 'avoids-pork']);
  });

  it('drops a religion or health choice that has no consent behind it', () => {
    expect(
      dietaryChoicesOf({ dietaryChoices: ['vegan', 'halal', 'avoids-pork'] }),
    ).toEqual(['vegan']);
    expect(
      dietaryChoicesOf({
        dietaryChoices: ['vegan', 'halal'],
        dietaryConsentAt: null,
      }),
    ).toEqual(['vegan']);
  });

  it('reads nothing from a document without choices', () => {
    expect(dietaryChoicesOf(undefined)).toEqual([]);
    expect(dietaryChoicesOf({})).toEqual([]);
    expect(dietaryChoicesOf({ dietaryChoices: 'vegan' })).toEqual([]);
  });

  it('records consent only as a non-empty timestamp', () => {
    expect(hasDietaryConsent({ dietaryConsentAt: '2026-11-25' })).toBe(true);
    expect(hasDietaryConsent({ dietaryConsentAt: null })).toBe(false);
    expect(hasDietaryConsent({ dietaryConsentAt: '' })).toBe(false);
    expect(hasDietaryConsent(undefined)).toBe(false);
  });
});
