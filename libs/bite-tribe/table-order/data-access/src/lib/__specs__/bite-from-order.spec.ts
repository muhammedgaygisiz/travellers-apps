import type { TableVisitBillLine, VisitSummary } from 'model';
import { biteFromOrderLine } from '../bite-from-order';

/**
 * A dish somebody ordered, as the Bite form wants it (GitHub issue #1112).
 *
 * The acceptance criterion is arithmetic here: every field the form marks
 * required has to be filled, or the guest is asked for something the order
 * already knows. A pure function, so this is where that is checked rather than
 * through two screens.
 */
const SUMMARY: VisitSummary = {
  id: 'visit-1',
  restaurantId: 'r1',
  restaurantName: 'Sakura Kitchen',
  tableLabel: '12',
  restaurantPosition: { latitude: 47.3769, longitude: 8.5417 },
  closedAt: 1_700_000_000_000,
  currency: 'EUR',
  lines: [],
  total: 24,
  paymentStatus: 'settled',
};

const LINE: TableVisitBillLine = {
  menuItemId: 'item-1',
  name: 'Margherita',
  quantity: 2,
  unitPrice: 12,
  lineTotal: 24,
};

describe('biteFromOrderLine', () => {
  /**
   * The criterion: what is left for the guest is a photo, a rating and a
   * comment. None of those is required to publish, so a draft carrying these
   * five is publishable as it stands.
   */
  it('fills every field the Bite form requires', () => {
    const draft = biteFromOrderLine(SUMMARY, LINE);

    expect(draft.name).toBe('Margherita');
    expect(draft.place).toBe('Sakura Kitchen');
    expect(draft.price).toBe(12);
    expect(draft.currency).toBe('EUR');
    expect(draft.position).toEqual({ latitude: 47.3769, longitude: 8.5417 });
  });

  /**
   * A guest who ordered two pizzas ate one of them. A Bite priced at both
   * lies about what a Margherita costs, which is the number issue #452 will
   * one day suggest from.
   */
  it('prices the dish, not the line', () => {
    expect(biteFromOrderLine(SUMMARY, LINE).price).toBe(12);
    expect(biteFromOrderLine(SUMMARY, LINE).price).not.toBe(LINE.lineTotal);
  });

  it('carries the verified restaurant rather than only its name', () => {
    expect(biteFromOrderLine(SUMMARY, LINE).restaurantId).toBe('r1');
  });

  /** So the nightly reminder knows this meal has been written about. */
  it('names the meal it came from', () => {
    expect(biteFromOrderLine(SUMMARY, LINE).visitId).toBe('visit-1');
  });

  it('names the variant beside the dish', () => {
    const draft = biteFromOrderLine(SUMMARY, {
      ...LINE,
      variantId: 'large',
      variantName: 'Large',
    });

    expect(draft.name).toBe('Margherita - Large');
  });

  /**
   * A summary written before the position was carried, or for a restaurant
   * that has none. The form then asks as it would for any other Bite - what it
   * must not do is offer `undefined`, which Firestore refuses and which took a
   * menu-derived Bite down in issue #1233.
   */
  it('omits the position rather than sending nothing when there is none', () => {
    const draft = biteFromOrderLine(
      { ...SUMMARY, restaurantPosition: undefined },
      LINE,
    );

    expect('position' in draft).toBe(false);
  });

  it('sends no undefined fields at all', () => {
    const draft = biteFromOrderLine(
      { ...SUMMARY, restaurantPosition: undefined },
      LINE,
    );

    expect(Object.values(draft).every((value) => value !== undefined)).toBe(
      true,
    );
  });
});
