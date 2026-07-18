import { getDistance } from '../get-distance';

describe('getDistance', () => {
  it('should return restaurant distance if available and not NaN', () => {
    const restaurant = { distance: '5 km' };
    const bite = { distance: '10 km' };
    expect(getDistance(restaurant, bite)).toBe('5 km');
  });

  it('should return bite distance if restaurant distance is NaN', () => {
    const restaurant = { distance: 'NaN' };
    const bite = { distance: '10 km' };
    expect(getDistance(restaurant, bite)).toBe('10 km');
  });

  it('should return bite distance if restaurant is undefined', () => {
    const restaurant = undefined;
    const bite = { distance: '10 km' };
    expect(getDistance(restaurant, bite)).toBe('10 km');
  });

  it('should return bite distance if restaurant distance is undefined', () => {
    const restaurant = {};
    const bite = { distance: '10 km' };
    expect(getDistance(restaurant, bite)).toBe('10 km');
  });

  it('should return undefined if both distances are unavailable', () => {
    const restaurant = {};
    const bite = {};
    expect(getDistance(restaurant, bite)).toBeUndefined();
  });

  it('should return undefined if both restaurant and bite are undefined', () => {
    const restaurant = undefined;
    const bite = undefined;
    expect(getDistance(restaurant, bite)).toBeUndefined();
  });
});
