import * as fromSelectors from '../selectors';

jest.mock('@ngrx/router-store', () => ({
  getRouterSelectors: (): {
    selectRouteParams: (state: unknown) => unknown;
    selectQueryParams: (state: unknown) => unknown;
  } => ({
    selectRouteParams: (state: unknown): unknown => state,
    selectQueryParams: (state: unknown): unknown => state,
  }),
}));

describe('Router Selectors', () => {
  afterEach(() => {
    jest.clearAllMocks();
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
      const params = undefined as unknown as Parameters<
        typeof fromSelectors.biteId.projector
      >[0];
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
      const params = undefined as unknown as Parameters<
        typeof fromSelectors.restaurantId.projector
      >[0];
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
      const params = undefined as unknown as Parameters<
        typeof fromSelectors.menuId.projector
      >[0];
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
      const params = undefined as unknown as Parameters<
        typeof fromSelectors.bucketlistId.projector
      >[0];
      const result = fromSelectors.bucketlistId.projector(params);
      expect(result).toBeUndefined();
    });
  });

  describe('weekRange', () => {
    it('should return the week bounds from the query params', () => {
      const result = fromSelectors.weekRange.projector({
        weekStart: '1752444000000',
        weekEnd: '1753048799999',
      });

      expect(result).toEqual({
        weekStart: 1752444000000,
        weekEnd: 1753048799999,
      });
    });

    it('should return undefined when only one bound is present', () => {
      // Half a range says nothing about which week to show, so consumers must
      // fall back to their own default instead of guessing the other bound.
      const result = fromSelectors.weekRange.projector({
        weekStart: '1752444000000',
      });

      expect(result).toBeUndefined();
    });

    it('should return undefined for non-numeric bounds', () => {
      const result = fromSelectors.weekRange.projector({
        weekStart: 'last-week',
        weekEnd: 'now',
      });

      expect(result).toBeUndefined();
    });

    it('should return undefined when params is undefined', () => {
      const params = undefined as unknown as Parameters<
        typeof fromSelectors.weekRange.projector
      >[0];

      expect(fromSelectors.weekRange.projector(params)).toBeUndefined();
    });
  });
});
