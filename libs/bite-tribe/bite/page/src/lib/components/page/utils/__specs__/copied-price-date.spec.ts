import type { Bite } from 'model';
import { copiedPriceDate } from '../copied-price-date';

// Issue #2018: a copied price older than 30 days is dated on the form.
describe('copiedPriceDate', () => {
  const now = new Date('2026-11-14T12:00:00.000Z');
  const copyOf = (createdAt?: string): Partial<Bite> => ({
    copiedFrom: { biteId: 'sams-bite', createdAt },
  });

  it('dates a price copied from a Bite older than 30 days', () => {
    expect(copiedPriceDate(copyOf('2026-03-02T19:00:00.000Z'), now)).toEqual(
      new Date('2026-03-02T19:00:00.000Z'),
    );
  });

  it('leaves a fresh copy undated', () => {
    expect(
      copiedPriceDate(copyOf('2026-11-13T19:00:00.000Z'), now),
    ).toBeUndefined();
  });

  it('leaves a copy exactly 30 days old undated', () => {
    expect(
      copiedPriceDate(copyOf('2026-10-15T12:00:00.000Z'), now),
    ).toBeUndefined();
  });

  it('leaves a draft that is not a copy undated', () => {
    expect(copiedPriceDate({ name: 'Margherita' }, now)).toBeUndefined();
    expect(copiedPriceDate(undefined, now)).toBeUndefined();
  });

  it('leaves a copy without a usable date undated', () => {
    expect(copiedPriceDate(copyOf(undefined), now)).toBeUndefined();
    expect(copiedPriceDate(copyOf('not a date'), now)).toBeUndefined();
  });
});
