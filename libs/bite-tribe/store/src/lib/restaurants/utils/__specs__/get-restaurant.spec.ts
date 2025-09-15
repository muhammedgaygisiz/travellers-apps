import { getRestaurant } from '../get-restaurant';
import { Restaurant } from 'model';

const normalizeMock = jest.fn();
jest.mock('utils', () => ({
  normalize: (...args: any): void => normalizeMock(...args),
}));

describe('getRestaurant', () => {
  const restaurants = [
    { id: '1', name: 'Pizza Place' } as Restaurant,
    { id: '2', name: 'Sushi Spot' } as Restaurant,
    { id: '3', name: 'Burger Joint' } as Restaurant,
  ];

  beforeEach(() => {
    normalizeMock.mockImplementation((str: string) => str);
  });

  it('should return the restaurant by id if found', () => {
    const result = getRestaurant(restaurants, '2');
    expect(result).toEqual({ id: '2', name: 'Sushi Spot' });
    expect(normalizeMock).toHaveBeenCalledWith('2');
  });

  it('should return the restaurant by name if id not found', () => {
    const result = getRestaurant(restaurants, 'Burger Joint');
    expect(result).toEqual({ id: '3', name: 'Burger Joint' });
  });

  it('should return undefined if no match is found', () => {
    const result = getRestaurant(restaurants, 'Nonexistent');
    expect(result).toBeUndefined();
  });

  it('should handle special characters in id', () => {
    const result = getRestaurant(restaurants, 'Pizza%20Place');
    expect(result).toEqual({ id: '1', name: 'Pizza Place' });
  });
});
