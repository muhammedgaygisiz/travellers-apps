import calculateIcon from '../calculate-icon';

describe('calculateIcon', () => {
  describe('given conditionFulfilled true', () => {
    it('should return checkmark-outline', () => {
      const result = calculateIcon(true);

      expect(result).toEqual('checkmark-outline');
    });
  });

  describe('given conditionFulfilled false', () => {
    it('should return close-outline', () => {
      const result = calculateIcon(false);

      expect(result).toEqual('close-outline');
    });
  });
});
