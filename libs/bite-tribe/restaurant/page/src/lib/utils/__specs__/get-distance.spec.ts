import { describe, expect, it } from 'vitest';
import { getDistance } from '../get-distance';

describe('getDistance', () => {
  it('should return restaurant distance if available and not NaN', () => {
    const restaurant = { distance: '5 km' } as any;
    const bite = { distance: '10 km' } as any;
    expect(getDistance(restaurant, bite)).toBe('5 km');
  });

  it('should return bite distance if restaurant distance is NaN', () => {
    const restaurant = { distance: 'NaN' } as any;
    const bite = { distance: '10 km' } as any;
    expect(getDistance(restaurant, bite)).toBe('10 km');
  });

  it('should return bite distance if restaurant is undefined', () => {
    const restaurant = undefined as any;
    const bite = { distance: '10 km' } as any;
    expect(getDistance(restaurant, bite)).toBe('10 km');
  });

  it('should return bite distance if restaurant distance is undefined', () => {
    const restaurant = {} as any;
    const bite = { distance: '10 km' } as any;
    expect(getDistance(restaurant, bite)).toBe('10 km');
  });

  it('should return undefined if both distances are unavailable', () => {
    const restaurant = {} as any;
    const bite = {} as any;
    expect(getDistance(restaurant, bite)).toBeUndefined();
  });

  it('should return undefined if both restaurant and bite are undefined', () => {
    const restaurant = undefined as any;
    const bite = undefined as any;
    expect(getDistance(restaurant, bite)).toBeUndefined();
  });
});
