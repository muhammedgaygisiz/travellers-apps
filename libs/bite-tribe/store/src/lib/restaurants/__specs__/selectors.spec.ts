import { restaurant, restaurants, restaurantToCreate } from '../selectors';

describe('restaurant Selectors', () => {
  describe('restaurants', () => {
    it('should return restaurants with distances and unsaved restaurants from bites', () => {
      const state = {
        restaurants: [
          {
            id: '1',
            name: 'Saved Restaurant 1',
            position: { latitude: 40.7128, longitude: -74.006 },
          },
          {
            id: '2',
            name: 'Saved Restaurant 2',
            position: { latitude: 34.0522, longitude: -118.2437 },
          },
        ],
        gpsPosition: { latitude: 37.7749, longitude: -122.4194 },
        bites: [
          {
            id: 'b1',
            place: 'Unsaved Restaurant 1',
            position: { latitude: 37.7749, longitude: -122.4194 },
            restaurantId: null,
          },
          {
            id: 'b2',
            place: 'Saved Restaurant 1',
            position: { latitude: 40.7128, longitude: -74.006 },
            restaurantId: null,
          },
          {
            id: 'b3',
            place: 'Unsaved Restaurant 1',
            position: { latitude: 37.7749, longitude: -122.4194 },
            restaurantId: null,
          },
        ],
      };

      const result = restaurants.projector(
        state.restaurants,
        state.gpsPosition,
        state.bites,
      );

      expect(result.length).toBe(3);

      const savedRestaurant1 = result.find(
        (r) => r.name === 'Saved Restaurant 1',
      );
      const savedRestaurant2 = result.find(
        (r) => r.name === 'Saved Restaurant 2',
      );
      const unsavedRestaurant1 = result.find(
        (r) => r.name === 'Unsaved Restaurant 1',
      );

      expect(savedRestaurant1).toBeDefined();
      expect(savedRestaurant1?.distance).toBeDefined();
      expect(savedRestaurant2).toBeDefined();
      expect(savedRestaurant2?.distance).toBeDefined();
      expect(unsavedRestaurant1).toBeDefined();
      expect(unsavedRestaurant1?.distance).toBeDefined();
      expect(unsavedRestaurant1?.unsaved).toBe(true);
      expect(unsavedRestaurant1?.biteIds).toEqual(['b1', 'b3']);
    });

    it('should handle empty restaurants and bites', () => {
      const state = {
        restaurants: [],
        gpsPosition: { latitude: 37.7749, longitude: -122.4194 },
        bites: [],
      };

      const result = restaurants.projector(
        state.restaurants,
        state.gpsPosition,
        state.bites,
      );

      expect(result.length).toBe(0);
    });

    it('should handle undefined gpsPosition', () => {
      const state = {
        restaurants: [
          {
            id: '1',
            name: 'Saved Restaurant 1',
            position: { latitude: 40.7128, longitude: -74.006 },
          },
        ],
        gpsPosition: undefined,
        bites: [
          {
            id: 'b1',
            place: 'Unsaved Restaurant 1',
            position: { latitude: 37.7749, longitude: -122.4194 },
            restaurantId: null,
          },
        ],
      };

      const result = restaurants.projector(
        state.restaurants,
        state.gpsPosition,
        state.bites,
      );

      expect(result.length).toBe(2);

      const savedRestaurant1 = result.find(
        (r) => r.name === 'Saved Restaurant 1',
      );
      const unsavedRestaurant1 = result.find(
        (r) => r.name === 'Unsaved Restaurant 1',
      );

      expect(savedRestaurant1).toBeDefined();
      expect(savedRestaurant1?.distance).toBeUndefined();
      expect(unsavedRestaurant1).toBeDefined();
      expect(unsavedRestaurant1?.distance).toBeUndefined();
      expect(unsavedRestaurant1?.unsaved).toBe(true);
      expect(unsavedRestaurant1?.biteIds).toEqual(['b1']);
    });
  });

  describe('restaurant', () => {
    it('should return the restaurant by ID with distance', () => {
      const state = {
        restaurants: [
          {
            id: '1',
            name: 'Saved Restaurant 1',
            position: { latitude: 40.7128, longitude: -74.006 },
          },
          {
            id: '2',
            name: 'Saved Restaurant 2',
            position: { latitude: 34.0522, longitude: -118.2437 },
          },
        ],
        gpsPosition: { latitude: 37.7749, longitude: -122.4194 },
      };

      const result = restaurant.projector(
        '1',
        state.restaurants,
        state.gpsPosition,
      );

      expect(result).toBeDefined();
      expect(result?.id).toBe('1');
      expect(result?.distance).toBeDefined();
    });

    it('should return undefined if restaurant ID not found', () => {
      const state = {
        restaurants: [
          {
            id: '1',
            name: 'Saved Restaurant 1',
            position: { latitude: 40.7128, longitude: -74.006 },
          },
        ],
        gpsPosition: { latitude: 37.7749, longitude: -122.4194 },
      };

      const result = restaurant.projector(
        'nonexistent-id',
        state.restaurants,
        state.gpsPosition,
      );

      expect(result).toBeUndefined();
    });

    it('should return undefined if gpsPosition is undefined', () => {
      const state = {
        restaurants: [
          {
            id: '1',
            name: 'Saved Restaurant 1',
            position: { latitude: 40.7128, longitude: -74.006 },
          },
        ],
        gpsPosition: undefined,
      };

      const result = restaurant.projector(
        '1',
        state.restaurants,
        state.gpsPosition,
      );

      expect(result).toBeUndefined();
    });
  });

  describe('restaurantToCreate', () => {
    it('should return the restaurant to create from state', () => {
      const state = {
        restaurantToCreate: {
          name: 'New Restaurant',
          position: { latitude: 51.5074, longitude: -0.1278 },
          biteIds: [],
        },
      };

      const result = restaurantToCreate.projector(state.restaurantToCreate, []);

      expect(result).toBeDefined();
      expect(result?.name).toBe('New Restaurant');
      expect(result?.position).toEqual({
        latitude: 51.5074,
        longitude: -0.1278,
      });
    });

    it('should include bites of restaurant', () => {
      const state = {
        restaurantToCreate: {
          name: 'New Restaurant',
          position: { latitude: 51.5074, longitude: -0.1278 },
          biteIds: ['b1', 'b2'],
        },
        bites: [
          {
            id: 'b1',
            place: 'New Restaurant',
            position: { latitude: 51.5074, longitude: -0.1278 },
            restaurantId: null,
          },
          {
            id: 'b2',
            place: 'New Restaurant',
            position: { latitude: 51.5074, longitude: -0.1278 },
            restaurantId: null,
          },
          {
            id: 'b3',
            place: 'Other Place',
            position: { latitude: 40.7128, longitude: -74.006 },
            restaurantId: null,
          },
        ],
      };

      const result = restaurantToCreate.projector(
        state.restaurantToCreate,
        state.bites,
      );

      expect(result).toBeDefined();
      expect(result?.bites?.length).toBe(2);
      expect(result?.bites).toEqual([
        {
          id: 'b1',
          place: 'New Restaurant',
          position: { latitude: 51.5074, longitude: -0.1278 },
          restaurantId: null,
        },
        {
          id: 'b2',
          place: 'New Restaurant',
          position: { latitude: 51.5074, longitude: -0.1278 },
          restaurantId: null,
        },
      ]);
    });

    it('should return undefined when no restaurant has been selected yet', () => {
      const result = restaurantToCreate.projector(undefined, []);

      expect(result).toBeUndefined();
    });

    it('should keep the bites carried by the selection when the store has none', () => {
      const candidateBite = {
        id: 'b1',
        name: 'Margherita',
        place: 'New Restaurant',
      };

      const result = restaurantToCreate.projector(
        {
          id: '',
          name: 'New Restaurant',
          position: { latitude: 51.5074, longitude: -0.1278 },
          restaurantCandidateId: 'candidate-1',
          biteIds: ['b1'],
          bites: [candidateBite],
          unsaved: true,
        },
        [],
      );

      expect(result?.bites).toEqual([candidateBite]);
    });

    it('should drop bite ids that resolve to no bite at all', () => {
      const result = restaurantToCreate.projector(
        {
          id: '',
          name: 'New Restaurant',
          position: { latitude: 51.5074, longitude: -0.1278 },
          biteIds: ['b1', 'missing'],
          bites: [{ id: 'b1', name: 'Margherita' }],
        },
        [],
      );

      expect(result?.bites).toEqual([{ id: 'b1', name: 'Margherita' }]);
    });

    it('should return an empty bite list when the selection has no bite ids', () => {
      const result = restaurantToCreate.projector(
        {
          id: '',
          name: 'New Restaurant',
          position: { latitude: 51.5074, longitude: -0.1278 },
          unsaved: true,
        },
        [],
      );

      expect(result?.bites).toEqual([]);
    });
  });
});
