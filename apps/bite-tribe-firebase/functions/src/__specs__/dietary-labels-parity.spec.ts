import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The dietary label vocabulary exists twice: in the model, and inside
 * `firestore.rules`, which checks a Bite's `dietaryLabels` against it (GitHub
 * issue #2195). Rules cannot import a list, so this spec reads both files as
 * text and keeps the copy honest, as `dietary-statements-parity.spec.ts` does
 * for the restaurant statements.
 */
const ROOT = join(__dirname, '..', '..', '..', '..', '..');

const LIBRARY = join(
  ROOT,
  'libs',
  'bite-tribe-common',
  'model',
  'src',
  'lib',
  'dietary-label.ts',
);

const RULES = join(ROOT, 'apps', 'bite-tribe-firebase', 'firestore.rules');

const quoted = (block: string | undefined): string[] =>
  [...(block ?? '').matchAll(/'([^']+)'/g)].map((match) => match[1]);

describe('dietary label parity', () => {
  const library = readFileSync(LIBRARY, 'utf8');
  const rules = readFileSync(RULES, 'utf8');

  // Keys only, quoted (`'gluten-free'`) or bare (`vegan`), one per line.
  const vocabulary = [
    ...(
      library.match(/DIETARY_LABEL_CLASSES = \{([\s\S]*?)\} as const/)?.[1] ??
      ''
    ).matchAll(/^\s*'?([a-z-]+)'?:/gm),
  ].map((match) => match[1]);

  const ruleBlock = rules.match(
    /function hasValidDietaryLabels\(\) \{([\s\S]*?)\n {6}\}/,
  )?.[1];

  it('reads nine labels from the model', () => {
    expect(vocabulary).toHaveLength(9);
  });

  it('lets the rules admit exactly the vocabulary', () => {
    expect(quoted(ruleBlock?.match(/hasOnly\(\[([\s\S]*?)\]\)/)?.[1])).toEqual(
      vocabulary,
    );
  });

  it('caps the list at the size of the vocabulary', () => {
    expect(ruleBlock).toContain(`dietaryLabels.size() <= ${vocabulary.length}`);
  });
});
