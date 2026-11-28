import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DIETARY_LABEL_APPROVALS_COLLECTION,
  DIETARY_REMOVAL_GOT_SICK_THRESHOLD,
  DIETARY_REMOVAL_THRESHOLDS,
  DIETARY_REMOVAL_WINDOW_DAYS,
  DIETARY_STRIKE_LIMIT,
  DIETARY_STRIKE_PERIOD_DAYS,
  HIGH_RISK_DIETARY_LABELS,
} from '../functions/dietary/menu-dietary';

/**
 * The removal thresholds exist twice, for the reason
 * `dietary-votes-parity.spec.ts` gives: this project cannot import
 * `libs/bite-tribe-common/model` (GitHub issue #2198). It reads the library as
 * text.
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

const numberIn = (source: string, name: string): number =>
  Number(source.match(new RegExp(`${name} = (\\d+);`))?.[1]);

describe('menu dietary parity', () => {
  const removal = readFileSync(join(MODEL, 'dietary-removal.ts'), 'utf8');
  const labels = readFileSync(join(MODEL, 'dietary-label.ts'), 'utf8');

  it('removes at the same thresholds, over the same window', () => {
    expect(numberIn(removal, 'DIETARY_REMOVAL_WINDOW_DAYS')).toBe(
      DIETARY_REMOVAL_WINDOW_DAYS,
    );
    expect(numberIn(removal, 'DIETARY_REMOVAL_GOT_SICK_THRESHOLD')).toBe(
      DIETARY_REMOVAL_GOT_SICK_THRESHOLD,
    );
    expect(Number(removal.match(/lifestyle: (\d+),/)?.[1])).toBe(
      DIETARY_REMOVAL_THRESHOLDS.lifestyle,
    );
    expect(Number(removal.match(/'high-risk': (\d+),/)?.[1])).toBe(
      DIETARY_REMOVAL_THRESHOLDS['high-risk'],
    );
  });

  it('counts strikes the same way', () => {
    expect(numberIn(removal, 'DIETARY_STRIKE_LIMIT')).toBe(
      DIETARY_STRIKE_LIMIT,
    );
    expect(numberIn(removal, 'DIETARY_STRIKE_PERIOD_DAYS')).toBe(
      DIETARY_STRIKE_PERIOD_DAYS,
    );
    expect(removal).toContain(
      `DIETARY_LABEL_APPROVALS_COLLECTION = '${DIETARY_LABEL_APPROVALS_COLLECTION}'`,
    );
  });

  it('treats the same labels as high-risk', () => {
    const highRisk = [
      ...labels.matchAll(/^\s*'?([a-z-]+)'?: 'high-risk',/gm),
    ].map((match) => match[1]);

    expect(highRisk).toEqual([...HIGH_RISK_DIETARY_LABELS]);
  });
});
