import { withGooglePlaceDistance } from '../with-google-place-distance';

describe('withGooglePlaceDistance', () => {
  it('adds distances from the origin and sorts nearest first', () => {
    const result = withGooglePlaceDistance(
      [
        {
          placeId: 'far',
          name: 'Far Place',
          address: 'Far Street 1',
          position: { latitude: 40.86, longitude: 14.26 },
        },
        {
          placeId: 'near',
          name: 'Near Place',
          address: 'Near Street 1',
          position: { latitude: 40.8501, longitude: 14.26 },
        },
      ],
      { latitude: 40.85, longitude: 14.26 },
    );

    expect(result.map((place) => place.placeId)).toEqual(['near', 'far']);
    expect(result[0].distance).toBe('0.01');
  });

  it('keeps API order when no origin is available', () => {
    const result = withGooglePlaceDistance([
      {
        placeId: 'first',
        name: 'First Place',
        address: 'First Street 1',
        position: { latitude: 1, longitude: 2 },
      },
      {
        placeId: 'second',
        name: 'Second Place',
        address: 'Second Street 1',
        position: { latitude: 3, longitude: 4 },
      },
    ]);

    expect(result.map((place) => place.placeId)).toEqual(['first', 'second']);
    expect(result[0].distance).toBeUndefined();
  });
});
