import type { NearbyRestaurant, Restaurant } from 'model';
import { mergeNearbyRestaurants } from '../merge-nearby-restaurants';

const HERE = { latitude: 48.1372, longitude: 11.5762 };
const trattoria = {
  id: 'qa-trattoria',
  name: 'QA Trattoria',
  position: { latitude: 48.137154, longitude: 11.576124 },
} as Restaurant;

/** See GitHub issue #2308. */
describe('mergeNearbyRestaurants', () => {
  it('adds a stored restaurant nobody has posted a Bite at yet', () => {
    const merged = mergeNearbyRestaurants([], [trattoria], HERE);

    expect(merged).toEqual([
      expect.objectContaining({
        name: 'QA Trattoria',
        restaurantId: 'qa-trattoria',
        position: trattoria.position,
      }),
    ]);
    expect(merged[0].distance).toBeDefined();
  });

  it('does not repeat a restaurant the Bites already list, by id or by name', () => {
    const fromBites: NearbyRestaurant[] = [
      { name: 'QA Trattoria', restaurantId: 'qa-trattoria', distance: '0.1' },
    ];

    expect(mergeNearbyRestaurants(fromBites, [trattoria], HERE)).toEqual(
      fromBites,
    );
    expect(
      mergeNearbyRestaurants(
        [{ name: 'qa trattoria ', distance: '0.1' }],
        [trattoria],
        HERE,
      ),
    ).toHaveLength(1);
  });

  it('links a Bite-derived name to the stored restaurant it names', () => {
    const [entry] = mergeNearbyRestaurants(
      [{ name: 'QA Trattoria', distance: '0.1' }],
      [trattoria],
      HERE,
    );

    expect(entry.restaurantId).toBe('qa-trattoria');
  });

  it('lists in name order and skips a stored restaurant without a name', () => {
    const merged = mergeNearbyRestaurants(
      [{ name: 'Zum Franziskaner' }],
      [trattoria, { ...trattoria, id: 'x', name: ' ' } as Restaurant],
      HERE,
    );

    expect(merged.map((entry) => entry.name)).toEqual([
      'QA Trattoria',
      'Zum Franziskaner',
    ]);
  });
});
