import { toSearchBite } from './search-bite';

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
});
