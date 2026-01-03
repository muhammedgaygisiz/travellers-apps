import * as fromSelectors from '../selectors';
import { vi } from 'vitest';

vi.mock('@ngrx/router-store', () => ({
  getRouterSelectors: (): any => ({
    selectRouteParams: (state: any): any => state,
  }),
}));

describe('Router Selectors', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('biteId', () => {
    it('should return biteId from route params', () => {
      const params = { biteId: '123' };
      const result = fromSelectors.biteId.projector(params);
      expect(result).toBe('123');
    });

    it('should return undefined when biteId is not in params', () => {
      const params = {};
      const result = fromSelectors.biteId.projector(params);
      expect(result).toBeUndefined();
    });

    it('should return undefined when params is undefined', () => {
      const params = undefined as any;
      const result = fromSelectors.biteId.projector(params);
      expect(result).toBeUndefined();
    });
  });

  describe('restaurantId', () => {
    it('should return restaurantId from route params', () => {
      const params = { restaurantId: 'rest123' };
      const result = fromSelectors.restaurantId.projector(params);
      expect(result).toBe('rest123');
    });

    it('should return undefined when restaurantId is not in params', () => {
      const params = {};
      const result = fromSelectors.restaurantId.projector(params);
      expect(result).toBeUndefined();
    });

    it('should return undefined when params is undefined', () => {
      const params = undefined as any;
      const result = fromSelectors.restaurantId.projector(params);
      expect(result).toBeUndefined();
    });
  });

  describe('menuId', () => {
    it('should return menuId from route params', () => {
      const params = { menuId: 'menu123' };
      const result = fromSelectors.menuId.projector(params);
      expect(result).toBe('menu123');
    });

    it('should return undefined when menuId is not in params', () => {
      const params = {};
      const result = fromSelectors.menuId.projector(params);
      expect(result).toBeUndefined();
    });

    it('should return undefined when params is undefined', () => {
      const params = undefined as any;
      const result = fromSelectors.menuId.projector(params);
      expect(result).toBeUndefined();
    });
  });

  describe('bucketlistId', () => {
    it('should return bucketlistId from route params', () => {
      const params = { bucketlistId: 'bucket123' };
      const result = fromSelectors.bucketlistId.projector(params);
      expect(result).toBe('bucket123');
    });

    it('should return undefined when bucketlistId is not in params', () => {
      const params = {};
      const result = fromSelectors.bucketlistId.projector(params);
      expect(result).toBeUndefined();
    });

    it('should return undefined when params is undefined', () => {
      const params = undefined as any;
      const result = fromSelectors.bucketlistId.projector(params);
      expect(result).toBeUndefined();
    });
  });
});
