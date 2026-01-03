import { getBitesByRestaurantName } from '../get-bites-by-restaurant-name';
import { Bite } from 'model';
import { vi } from 'vitest';

const getSimilarityScoreMock = vi.fn();
const normalizeMock = vi.fn();
vi.mock('utils', () => ({
  getSimilarityScore: (): void => getSimilarityScoreMock(),
  normalize: (): void => normalizeMock(),
}));

describe('getBitesByRestaurantName', () => {
  const bites = [
    { id: '1', place: 'Pizza Place', restaurantId: 'rest1' } as Bite,
    { id: '2', place: 'Burger Joint', restaurantId: 'rest2' } as Bite,
    { id: '3', place: 'Sushi Spot', restaurantId: 'rest3' } as Bite,
    { id: '4', place: 'Pasta House', restaurantId: 'rest1' } as Bite,
  ];

  beforeEach(() => {
    getSimilarityScoreMock.mockReturnValue([]);
  });

  it('should return bites matching the restaurant name exactly', () => {
    getSimilarityScoreMock
      .mockReturnValueOnce([])
      .mockReturnValueOnce([{ score: 100 }])
      .mockReturnValue([]);
    const result = getBitesByRestaurantName('burger joint', bites, 'rest2');
    expect(result).toEqual([bites[1]]);
  });

  it('should return bites matching the restaurant name fuzzily', () => {
    getSimilarityScoreMock
      .mockReturnValueOnce([])
      .mockReturnValueOnce([{ score: 70 }])
      .mockReturnValue([]);
    const result = getBitesByRestaurantName('burgar jont', bites, 'rest2');
    expect(result).toEqual([bites[1]]);
  });

  it('should return bites matching the restaurant ID', () => {
    const result = getBitesByRestaurantName('nonexistent', bites, 'rest1');
    expect(result).toEqual([bites[0], bites[3]]);
  });

  it('should return an empty array if no matches are found', () => {
    const result = getBitesByRestaurantName('nonexistent', bites, 'restX');
    expect(result).toEqual([]);
  });
});
