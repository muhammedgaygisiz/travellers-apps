import type { NearbyRestaurant } from 'model';
import {
  getRestaurantsNearBite,
  hasRestaurantNearBite,
} from '../restaurants-near-bite';

/** Where the device sits in the `Posting later` case of GitHub issue #1307. */
const BERN = { latitude: 46.948, longitude: 7.4474 };

/** Where the photo the Bite was built from was taken, ~1535 km away. */
const RONDA = { latitude: 36.7429, longitude: -5.1663 };

/** ~10 km north of Bern: 0.09° of latitude is a little under 10 km. */
const NEAR_BERN = { latitude: 47.038, longitude: 7.4474 };

/** ~20 km north of Bern, past the radius. */
const OUTSIDE_BERN = { latitude: 47.128, longitude: 7.4474 };

const restaurant = (
  name: string,
  position?: NearbyRestaurant['position'],
): NearbyRestaurant => ({ name, position });

describe(getRestaurantsNearBite.name, () => {
  it('should drop candidates that are far from the Bite', () => {
    const restaurants = [
      restaurant('Bütschelegg', NEAR_BERN),
      restaurant('Tuktuk Bistro', BERN),
    ];

    expect(getRestaurantsNearBite(restaurants, RONDA)).toEqual([]);
  });

  it('should keep candidates around a Bite posted where the device is', () => {
    const restaurants = [
      restaurant('Bütschelegg', NEAR_BERN),
      restaurant('Tuktuk Bistro', BERN),
    ];

    expect(getRestaurantsNearBite(restaurants, BERN)).toEqual(restaurants);
  });

  it('should drop a candidate just outside the radius', () => {
    const restaurants = [
      restaurant('Dörfli Schliern', NEAR_BERN),
      restaurant('Too Far', OUTSIDE_BERN),
    ];

    expect(getRestaurantsNearBite(restaurants, BERN)).toEqual([
      restaurant('Dörfli Schliern', NEAR_BERN),
    ]);
  });

  it('should keep a candidate whose position is unknown', () => {
    const restaurants = [restaurant('No Position')];

    expect(getRestaurantsNearBite(restaurants, RONDA)).toEqual(restaurants);
  });

  it('should pass the list through when the Bite has no position', () => {
    const restaurants = [restaurant('Negishi', BERN)];

    expect(getRestaurantsNearBite(restaurants, undefined)).toEqual(restaurants);
  });
});

describe(hasRestaurantNearBite.name, () => {
  it('should be false when every candidate is far from the Bite', () => {
    const restaurants = [
      restaurant('Bütschelegg', NEAR_BERN),
      restaurant('Tuktuk Bistro', BERN),
    ];

    expect(hasRestaurantNearBite(restaurants, RONDA)).toBe(false);
  });

  it('should be true when a candidate sits near the Bite', () => {
    const restaurants = [
      restaurant('Too Far', OUTSIDE_BERN),
      restaurant('Negishi', NEAR_BERN),
    ];

    expect(hasRestaurantNearBite(restaurants, BERN)).toBe(true);
  });

  it('should not let an unmeasurable candidate count as near', () => {
    expect(hasRestaurantNearBite([restaurant('No Position')], RONDA)).toBe(
      false,
    );
  });

  it('should be false without a Bite position to measure from', () => {
    expect(hasRestaurantNearBite([restaurant('Negishi', BERN)])).toBe(false);
  });

  it('should be false for an empty list', () => {
    expect(hasRestaurantNearBite([], BERN)).toBe(false);
  });
});
