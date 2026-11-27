import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DIETARY_DISPUTE_REASONS,
  DIETARY_LABELS,
  DIETARY_VOTE_MIN_ACCOUNT_AGE_DAYS,
  DIETARY_VOTES,
  MAX_DIETARY_VOTE_NOTE_LENGTH,
} from '../functions/dietary/dietary-votes';

/**
 * The vote vocabulary exists twice, for the reason
 * `dietary-statements-parity.spec.ts` gives: this project cannot import
 * `libs/bite-tribe-common/model`, so the callable keeps a copy and this spec
 * keeps it honest (GitHub issue #2197). It reads the library as text.
 */
const MODEL = join(
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
);

const listIn = (source: string, name: string): string[] => {
  const block = source.match(
    new RegExp(`${name} = \\[([\\s\\S]*?)\\] as const`),
  )?.[1];

  return [...(block ?? '').matchAll(/'([^']+)'/g)].map((match) => match[1]);
};

describe('dietary vote parity', () => {
  const votes = readFileSync(join(MODEL, 'dietary-vote.ts'), 'utf8');
  const labels = readFileSync(join(MODEL, 'dietary-label.ts'), 'utf8');

  it('lists the same votes and dispute reasons', () => {
    expect(listIn(votes, 'DIETARY_VOTES')).toEqual([...DIETARY_VOTES]);
    expect(listIn(votes, 'DIETARY_DISPUTE_REASONS')).toEqual([
      ...DIETARY_DISPUTE_REASONS,
    ]);
  });

  it('knows the same labels in the same order', () => {
    const block =
      labels.match(/DIETARY_LABEL_CLASSES = \{([\s\S]*?)\} as const/)?.[1] ??
      '';
    const keys = [...block.matchAll(/^\s*'?([a-z-]+)'?:/gm)].map(
      (match) => match[1],
    );

    expect(keys).toEqual([...DIETARY_LABELS]);
  });

  it('uses the same limits', () => {
    expect(votes).toContain(
      `MAX_DIETARY_VOTE_NOTE_LENGTH = ${MAX_DIETARY_VOTE_NOTE_LENGTH};`,
    );
    expect(votes).toContain(
      `DIETARY_VOTE_MIN_ACCOUNT_AGE_DAYS = ${DIETARY_VOTE_MIN_ACCOUNT_AGE_DAYS};`,
    );
  });
});
