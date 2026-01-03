import { describe, expect, it } from 'vitest';
import calculateColor from '../calculate-color';

describe('calculateColor', () => {
  describe('given condition is fulfilled = true', () => {
    it('should return success', () => {
      const result = calculateColor(true);

      expect(result).toEqual('success');
    });
  });

  describe('given condition is fulfilled = false', () => {
    it('should return danger', () => {
      const result = calculateColor(false);

      expect(result).toEqual('danger');
    });
  });

  describe('given condition is fulfilled = null', () => {
    it('should return empty string', () => {
      const result = calculateColor(null);

      expect(result).toEqual('');
    });
  });
});
