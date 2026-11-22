import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  MAX_CROSS_CONTAMINATION_NOTE_LENGTH,
  RESTAURANT_DIETARY_STATEMENTS,
} from '../functions/restaurants/dietary-statements';

/**
 * The restaurant dietary statements exist twice, for the reason
 * `table-state-parity.spec.ts` gives: this project cannot import
 * `libs/bite-tribe-common/model`, so the callable keeps a copy and this spec
 * keeps it honest (GitHub issue #2194). It reads the library as text.
 */
const LIBRARY = join(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  '..',
  'libs',
  'bite-tribe-common',
  'model',
  'src',
  'lib',
  'dietary-label.ts',
);

describe('dietary statement parity', () => {
  const source = readFileSync(LIBRARY, 'utf8');

  it('lists the same statements in the same order', () => {
    const block = source.match(
      /RESTAURANT_DIETARY_STATEMENTS = \[([\s\S]*?)\] as const/,
    )?.[1];
    const statements = [...(block ?? '').matchAll(/'([^']+)'/g)].map(
      (match) => match[1],
    );

    expect(statements).toEqual([...RESTAURANT_DIETARY_STATEMENTS]);
  });

  it('caps the note at the same length', () => {
    expect(source).toContain(
      `MAX_CROSS_CONTAMINATION_NOTE_LENGTH = ${MAX_CROSS_CONTAMINATION_NOTE_LENGTH};`,
    );
  });
});
