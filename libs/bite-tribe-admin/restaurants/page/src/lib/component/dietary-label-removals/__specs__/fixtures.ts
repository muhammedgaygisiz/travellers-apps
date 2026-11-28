import type { DietaryLabelRemovalEntry } from 'model';

/** A removal with a request and its evidence (GitHub issue #2199). */
export const REQUESTED_REMOVAL: DietaryLabelRemovalEntry = {
  removalId: 'restaurant-thai-garden__item-pad-thai__vegan',
  restaurantId: 'restaurant-thai-garden',
  restaurantName: 'Thai Garden',
  menuItemId: 'item-pad-thai',
  dishName: 'Pad Thai - Tofu',
  label: 'vegan',
  status: 'open',
  removedAt: '2026-11-20T09:00:00.000Z',
  disputes: 3,
  confirmations: 1,
  reasons: { 'animal-product': 2, 'staff-said-not': 1 },
  explanation:
    'We switched to a vegan fish sauce from a new supplier on 22 November.',
  requestedAt: '2026-11-26T09:00:00.000Z',
  imageStatus: 'pending',
  disputesDetail: [
    {
      reason: 'animal-product',
      note: 'The waiter said it has fish sauce.',
      votedAt: '2026-11-19T00:00:00.000Z',
    },
    { reason: 'animal-product', votedAt: '2026-11-18T00:00:00.000Z' },
    { reason: 'staff-said-not', votedAt: '2026-11-17T00:00:00.000Z' },
  ],
};

/** A removal nobody asked about, which an operator can still restore. */
export const UNREQUESTED_REMOVAL: DietaryLabelRemovalEntry = {
  removalId: 'restaurant-thai-garden__item-green-curry__halal',
  restaurantId: 'restaurant-thai-garden',
  restaurantName: 'Thai Garden',
  menuItemId: 'item-green-curry',
  dishName: 'Green curry',
  label: 'halal',
  status: 'open',
  removedAt: '2026-11-21T09:00:00.000Z',
  disputes: 1,
  confirmations: 0,
  reasons: { 'got-sick': 1 },
  disputesDetail: [{ reason: 'got-sick', votedAt: '2026-11-21T08:00:00.000Z' }],
};
