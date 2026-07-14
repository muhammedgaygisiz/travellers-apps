import {
  aggregateRestaurantCandidateEvidence,
  filterMatchingBitesForCandidate,
  filterWithinRestaurantCandidateRadius,
  findPendingRestaurantCandidateDuplicate,
  findVerifiedRestaurantDuplicate,
  getPlaceNameMatchScore,
  normalizePlaceName,
  planRestaurantCandidateGeohashBounds,
} from '../restaurant-candidates';

describe('restaurant candidate helpers', () => {
  const center = { latitude: 52.52, longitude: 13.405 };

  it('normalizes place names for matching', () => {
    expect(normalizePlaceName('  Café & Bistro!!  ')).toBe('cafe and bistro');
  });

  it('scores fuzzy place-name matches', () => {
    expect(
      getPlaceNameMatchScore('Cafe Central', 'Café Centrale'),
    ).toBeGreaterThan(0.9);
    expect(getPlaceNameMatchScore('Cafe Central', 'Burger Barn')).toBeLessThan(
      0.5,
    );
  });

  it('plans geohash bounds for the exact 200m candidate lookup radius', () => {
    const bounds = planRestaurantCandidateGeohashBounds(center);

    expect(bounds.length).toBeGreaterThan(0);
    expect(bounds.every((bound) => bound.length === 2)).toBe(true);
  });

  it('filters items by exact 200m distance after a geohash lookup', () => {
    const nearby = {
      id: 'nearby',
      position: { latitude: 52.5205, longitude: 13.4055 },
    };
    const far = { id: 'far', position: { latitude: 52.53, longitude: 13.42 } };

    expect(
      filterWithinRestaurantCandidateRadius(
        [nearby, far],
        center,
        (item) => item.position,
      ),
    ).toEqual([nearby]);
  });

  it('identifies nearby matching Bites without adding candidate links to them', () => {
    const matchingBite = {
      id: 'bite-1',
      place: 'Cafe Central',
      position: { latitude: 52.5205, longitude: 13.4055 },
    };
    const farBite = {
      id: 'bite-2',
      place: 'Cafe Central',
      position: { latitude: 52.53, longitude: 13.42 },
    };
    const differentNameBite = {
      id: 'bite-3',
      place: 'Burger Barn',
      position: { latitude: 52.5205, longitude: 13.4055 },
    };

    expect(
      filterMatchingBitesForCandidate(
        [matchingBite, farBite, differentNameBite],
        'Café Centrale',
        center,
      ),
    ).toEqual([matchingBite]);
    expect(matchingBite).not.toHaveProperty('restaurantCandidateId');
  });

  it('aggregates candidate evidence from matching Bites', () => {
    const draft = aggregateRestaurantCandidateEvidence(
      [
        {
          id: 'bite-1',
          place: 'Cafe Central',
          position: { latitude: 52.52, longitude: 13.405 },
          imagePath: 'images/bite-1.jpg',
          rating: 4,
        },
        {
          id: 'bite-2',
          place: 'Cafe Central',
          position: { latitude: 52.5205, longitude: 13.4055 },
          imagePath: 'images/bite-1.jpg',
          rating: 5,
        },
      ],
      'Fallback',
      center,
    );

    expect(draft).toMatchObject({
      name: 'Cafe Central',
      normalizedName: 'cafe central',
      biteIds: ['bite-1', 'bite-2'],
      evidence: {
        biteCount: 2,
        placeNames: { 'Cafe Central': 2 },
        averageRating: 4.5,
        imagePaths: ['images/bite-1.jpg'],
      },
    });
    expect(draft.geohash).toEqual(expect.any(String));
  });

  it('detects nearby verified restaurant duplicates first', () => {
    const duplicate = findVerifiedRestaurantDuplicate(
      [
        {
          id: 'restaurant-1',
          name: 'Cafe Central',
          position: { latitude: 52.5205, longitude: 13.4055 },
        },
      ],
      'Café Centrale',
      center,
    );

    expect(duplicate?.item.id).toBe('restaurant-1');
  });

  it('detects only pending candidate duplicates', () => {
    const duplicate = findPendingRestaurantCandidateDuplicate(
      [
        {
          id: 'candidate-1',
          normalizedName: 'cafe central',
          status: 'pending',
          position: { latitude: 52.5205, longitude: 13.4055 },
        },
        {
          id: 'candidate-2',
          normalizedName: 'cafe central',
          status: 'dismissed',
          position: { latitude: 52.5205, longitude: 13.4055 },
        },
      ],
      'Café Centrale',
      center,
    );

    expect(duplicate?.item.id).toBe('candidate-1');
  });
});
