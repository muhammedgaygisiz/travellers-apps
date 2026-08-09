import { toSearchBite } from '../search-bite';

describe('toSearchBite', () => {
  it('includes a valid Bite position in the search result', () => {
    const result = toSearchBite({
      id: 'bite-1',
      data: () => ({
        name: 'Butter Chicken',
        place: 'Tandoori House',
        position: { latitude: 46.948, longitude: 7.447 },
      }),
    } as never);

    expect(result).toEqual({
      id: 'bite-1',
      name: 'Butter Chicken',
      place: 'Tandoori House',
      position: { latitude: 46.948, longitude: 7.447 },
    });
  });

  it('omits an invalid Bite position', () => {
    const result = toSearchBite({
      id: 'bite-1',
      data: () => ({
        name: 'Butter Chicken',
        place: 'Tandoori House',
        position: { latitude: 'invalid', longitude: 7.447 },
      }),
    } as never);

    expect(result.position).toBeUndefined();
  });

  it('includes the rating so the client can render it in the marker', () => {
    const result = toSearchBite({
      id: 'bite-1',
      data: () => ({
        name: 'Butter Chicken',
        place: 'Tandoori House',
        rating: 5,
      }),
    } as never);

    expect(result.rating).toBe(5);
  });

  it.each([
    ['missing', undefined],
    ['not a number', '5'],
    ['not finite', Number.NaN],
  ])('omits a rating that is %s', (_case, rating) => {
    const result = toSearchBite({
      id: 'bite-1',
      data: () => ({
        name: 'Butter Chicken',
        place: 'Tandoori House',
        rating,
      }),
    } as never);

    // An unrated Bite has to stay unrated: the marker prints whatever number
    // it is given, so a coerced 0 would read as a real rating.
    expect(result).not.toHaveProperty('rating');
  });
});
