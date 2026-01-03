import { describe, expect, it } from 'vitest';
import { getPosition } from '../get-position';

describe('getPosition', () => {
  it('should return restaurant position if available', () => {
    const restaurant = { position: { lat: 1, lng: 2 } } as any;
    const bite = { position: { lat: 3, lng: 4 } } as any;
    const result = getPosition(restaurant, bite);
    expect(result).toEqual({ lat: 1, lng: 2 });
  });

  it('should return bite position if restaurant position is not available', () => {
    const restaurant = {} as any;
    const bite = { position: { lat: 3, lng: 4 } } as any;
    const result = getPosition(restaurant, bite);
    expect(result).toEqual({ lat: 3, lng: 4 });
  });

  it('should return null if neither restaurant nor bite position is available', () => {
    const restaurant = {} as any;
    const bite = {} as any;
    const result = getPosition(restaurant, bite);
    expect(result).toBeNull();
  });

  it('should return null if both restaurant and bite are undefined', () => {
    const result = getPosition(undefined, undefined);
    expect(result).toBeNull();
  });
});
