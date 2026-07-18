import { getPosition } from '../get-position';

describe('getPosition', () => {
  it('should return restaurant position if available', () => {
    const restaurant = { position: { latitude: 1, longitude: 2 } };
    const bite = { position: { latitude: 3, longitude: 4 } };
    const result = getPosition(restaurant, bite);
    expect(result).toEqual({ latitude: 1, longitude: 2 });
  });

  it('should return bite position if restaurant position is not available', () => {
    const restaurant = {};
    const bite = { position: { latitude: 3, longitude: 4 } };
    const result = getPosition(restaurant, bite);
    expect(result).toEqual({ latitude: 3, longitude: 4 });
  });

  it('should return null if neither restaurant nor bite position is available', () => {
    const restaurant = {};
    const bite = {};
    const result = getPosition(restaurant, bite);
    expect(result).toBeNull();
  });

  it('should return null if both restaurant and bite are undefined', () => {
    const result = getPosition(undefined, undefined);
    expect(result).toBeNull();
  });
});
