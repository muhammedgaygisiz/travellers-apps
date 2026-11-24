import {
  averageRatingOf,
  closeTo,
  matchRestaurantBites,
  ratedBitesOf,
} from '../restaurant-bites';

const CENTRE = { latitude: 48.137, longitude: 11.575 };
const at = (latitudeOffset = 0): { latitude: number; longitude: number } => ({
  latitude: CENTRE.latitude + latitudeOffset,
  longitude: CENTRE.longitude,
});

/** GitHub issues #2320 and #2133: one rule for the page and the dashboard. */
describe('restaurant Bites', () => {
  it('keeps the Bites within 200 m, and none without a position', () => {
    const near = { id: 'near', position: at(0.001) };
    const far = { id: 'far', position: at(0.01) };
    const nowhere = { id: 'nowhere' };

    expect(closeTo([near, far, nowhere], CENTRE)).toEqual([near]);
  });

  it("matches a restaurant's Bites by link or by name", () => {
    const linked = { place: 'Elsewhere', restaurantId: '/restaurants/r-1' };
    const named = { place: 'trattoria roma ' };
    const other = { place: 'Burger Bar' };

    expect(
      matchRestaurantBites(
        [linked, named, other],
        { id: 'r-1', name: 'Trattoria Roma' },
        undefined,
      ),
    ).toEqual([linked, named]);
  });

  it('matches by the fallback name without a restaurant, and keeps all without either', () => {
    const named = { place: 'Hidden Gem' };
    const linkedByName = { place: 'x', restaurantId: 'hidden gem' };
    const other = { place: 'Burger Bar' };
    const bites = [named, linkedByName, other];

    expect(matchRestaurantBites(bites, undefined, 'Hidden%20Gem')).toEqual([
      named,
      linkedByName,
    ]);
    expect(matchRestaurantBites(bites, undefined, undefined)).toEqual(bites);
  });

  it('counts only rated Bites, and averages them to one decimal', () => {
    const bites = [
      { rating: 4 },
      { rating: 5 },
      { rating: 4 },
      { rating: 0 },
      { rating: null },
      {},
    ];

    expect(ratedBitesOf(bites)).toHaveLength(3);
    expect(averageRatingOf(bites)).toBe(4.3);
    expect(averageRatingOf([])).toBe(0);
  });
});
