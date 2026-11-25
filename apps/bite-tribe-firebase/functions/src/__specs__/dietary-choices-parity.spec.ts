import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * A member's dietary choices exist twice: in the model, and inside
 * `firestore.rules`, which checks `settings/{uid}.dietaryChoices` against them
 * and refuses a religion or health choice without consent (GitHub issue
 * #2196). Rules cannot import a list, so this spec reads both as text and
 * keeps the copy honest, as `dietary-labels-parity.spec.ts` does for a Bite's
 * labels.
 */
const ROOT = join(__dirname, '..', '..', '..', '..', '..');

const MODEL = join(ROOT, 'libs', 'bite-tribe-common', 'model', 'src', 'lib');

const RULES = join(ROOT, 'apps', 'bite-tribe-firebase', 'firestore.rules');

const quoted = (block: string | undefined): string[] =>
  [...(block ?? '').matchAll(/'([^']+)'/g)].map((match) => match[1]);

describe('dietary choices parity', () => {
  const rules = readFileSync(RULES, 'utf8');
  const labels = readFileSync(join(MODEL, 'dietary-label.ts'), 'utf8');
  const choices = readFileSync(join(MODEL, 'dietary-choice.ts'), 'utf8');

  // `vegan: 'lifestyle',` or `'gluten-free': 'high-risk',`, one per line.
  const classes = [
    ...(
      labels.match(/DIETARY_LABEL_CLASSES = \{([\s\S]*?)\} as const/)?.[1] ?? ''
    ).matchAll(/^\s*'?([a-z-]+)'?: '([a-z-]+)'/gm),
  ].map(([, label, labelClass]) => ({ label, labelClass }));

  // The choices without a matching label, after `...DIETARY_LABELS`.
  const avoidances = quoted(
    choices.match(/DIETARY_CHOICES = \[([\s\S]*?)\] as const/)?.[1],
  );

  const DIETARY_CHOICES = [...classes.map(({ label }) => label), ...avoidances];
  const SENSITIVE_DIETARY_CHOICES = [
    ...classes
      .filter(({ labelClass }) => labelClass === 'high-risk')
      .map(({ label }) => label),
    ...avoidances,
  ];

  const ruleBlock = rules.match(
    /function hasValidDietaryChoices\(\) \{([\s\S]*?)\n {6}\}/,
  )?.[1];

  it('reads nine labels and two avoidances from the model', () => {
    expect(classes).toHaveLength(9);
    expect(avoidances).toEqual(['avoids-pork', 'avoids-alcohol']);
  });

  it('lets the rules admit exactly the choices', () => {
    expect(quoted(ruleBlock?.match(/hasOnly\(\[([\s\S]*?)\]\)/)?.[1])).toEqual([
      ...DIETARY_CHOICES,
    ]);
  });

  it('asks for consent for exactly the religion and health choices', () => {
    expect(quoted(ruleBlock?.match(/hasAny\(\[([\s\S]*?)\]\)/)?.[1])).toEqual([
      ...SENSITIVE_DIETARY_CHOICES,
    ]);
  });

  it('caps the list at the number of choices', () => {
    expect(ruleBlock).toContain(
      `dietaryChoices.size() <= ${DIETARY_CHOICES.length}`,
    );
  });
});
