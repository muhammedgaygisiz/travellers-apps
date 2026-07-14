import {
  parseAddress,
  toOpeningHours,
  toPlaceDetails,
} from '../get-place-details';

jest.mock('firebase-functions', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('firebase-functions/https', () => ({
  HttpsError: class HttpsError extends Error {
    constructor(
      public code: string,
      message: string,
    ) {
      super(message);
    }
  },
}));

jest.mock('firebase-functions/params', () => ({
  defineSecret: jest.fn((name: string) => ({
    name,
    value: jest.fn(() => 'secret-value'),
  })),
}));

jest.mock('../callable-options', () => ({
  onAppCheck: jest.fn((_options, handler) => handler),
}));

describe('get-place-details helpers', () => {
  describe('parseAddress', () => {
    it('joins route and street number into a single street', () => {
      const address = parseAddress([
        { longText: 'Main Street', types: ['route'] },
        { longText: '12', types: ['street_number'] },
        { longText: '10115', types: ['postal_code'] },
        { longText: 'Berlin', types: ['locality'] },
        { longText: 'Germany', shortText: 'DE', types: ['country'] },
      ]);

      expect(address).toEqual({
        street: 'Main Street 12',
        postcode: '10115',
        city: 'Berlin',
        country: 'Germany',
      });
    });

    it('falls back to postal_town when locality is missing', () => {
      const address = parseAddress([
        { longText: 'Cambridge', types: ['postal_town'] },
        { longText: 'United Kingdom', types: ['country'] },
      ]);

      expect(address.city).toBe('Cambridge');
      expect(address.country).toBe('United Kingdom');
    });

    it('prefers locality over postal_town when both are present', () => {
      const address = parseAddress([
        { longText: 'London', types: ['locality'] },
        { longText: 'Greater London', types: ['postal_town'] },
      ]);

      expect(address.city).toBe('London');
    });

    it('returns empty strings when components are missing', () => {
      expect(parseAddress()).toEqual({
        street: '',
        postcode: '',
        city: '',
        country: '',
      });
    });
  });

  describe('toOpeningHours', () => {
    it('returns all days closed when there are no periods', () => {
      const hours = toOpeningHours(undefined);

      expect(hours).toHaveLength(7);
      expect(hours.every((day) => day.isOpen === false)).toBe(true);
      expect(hours.every((day) => day.timeRanges.length === 0)).toBe(true);
      expect(hours.map((day) => day.day)).toEqual([
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday',
      ]);
    });

    it('maps a same-day period to a single time range', () => {
      const hours = toOpeningHours({
        periods: [
          {
            open: { day: 1, hour: 9, minute: 0 },
            close: { day: 1, hour: 17, minute: 30 },
          },
        ],
      });

      const monday = hours.find((day) => day.day === 'monday');
      expect(monday).toEqual({
        day: 'monday',
        isOpen: true,
        timeRanges: [{ from: '09:00', to: '17:30' }],
      });
    });

    it('splits an overnight period at midnight across two days', () => {
      const hours = toOpeningHours({
        periods: [
          {
            // Friday 18:00 -> Saturday 02:00
            open: { day: 5, hour: 18, minute: 0 },
            close: { day: 6, hour: 2, minute: 0 },
          },
        ],
      });

      const friday = hours.find((day) => day.day === 'friday');
      const saturday = hours.find((day) => day.day === 'saturday');

      expect(friday?.timeRanges).toEqual([{ from: '18:00', to: '23:59' }]);
      expect(saturday?.timeRanges).toEqual([{ from: '00:00', to: '02:00' }]);
      expect(friday?.isOpen).toBe(true);
      expect(saturday?.isOpen).toBe(true);
    });

    it('maps a 24h open period (no close) to a full-day range', () => {
      const hours = toOpeningHours({
        periods: [{ open: { day: 3, hour: 0, minute: 0 } }],
      });

      const wednesday = hours.find((day) => day.day === 'wednesday');
      expect(wednesday).toEqual({
        day: 'wednesday',
        isOpen: true,
        timeRanges: [{ from: '00:00', to: '23:59' }],
      });
    });

    it('maps multiple periods on the same day to multiple time ranges', () => {
      const hours = toOpeningHours({
        periods: [
          {
            open: { day: 2, hour: 12, minute: 0 },
            close: { day: 2, hour: 14, minute: 30 },
          },
          {
            open: { day: 2, hour: 18, minute: 0 },
            close: { day: 2, hour: 22, minute: 0 },
          },
        ],
      });

      const tuesday = hours.find((day) => day.day === 'tuesday');
      expect(tuesday?.timeRanges).toEqual([
        { from: '12:00', to: '14:30' },
        { from: '18:00', to: '22:00' },
      ]);
    });

    it('does not add a closing range when the period ends exactly at midnight', () => {
      const hours = toOpeningHours({
        periods: [
          {
            // Saturday 20:00 -> Sunday 00:00 (midnight)
            open: { day: 6, hour: 20, minute: 0 },
            close: { day: 0, hour: 0, minute: 0 },
          },
        ],
      });

      const saturday = hours.find((day) => day.day === 'saturday');
      const sunday = hours.find((day) => day.day === 'sunday');

      expect(saturday?.timeRanges).toEqual([{ from: '20:00', to: '23:59' }]);
      expect(sunday?.isOpen).toBe(false);
      expect(sunday?.timeRanges).toEqual([]);
    });

    it('fills intermediate days for a multi-day span', () => {
      const hours = toOpeningHours({
        periods: [
          {
            // Monday 10:00 -> Wednesday 12:00
            open: { day: 1, hour: 10, minute: 0 },
            close: { day: 3, hour: 12, minute: 0 },
          },
        ],
      });

      expect(hours.find((day) => day.day === 'monday')?.timeRanges).toEqual([
        { from: '10:00', to: '23:59' },
      ]);
      expect(hours.find((day) => day.day === 'tuesday')?.timeRanges).toEqual([
        { from: '00:00', to: '23:59' },
      ]);
      expect(hours.find((day) => day.day === 'wednesday')?.timeRanges).toEqual([
        { from: '00:00', to: '12:00' },
      ]);
    });
  });

  describe('toPlaceDetails', () => {
    it('maps a full Google response into the app-shaped result', () => {
      const details = toPlaceDetails({
        id: 'place-1',
        displayName: { text: 'Trattoria Roma' },
        editorialSummary: { text: 'Cosy Italian spot.' },
        addressComponents: [
          { longText: 'Via Roma', types: ['route'] },
          { longText: '1', types: ['street_number'] },
          { longText: '80100', types: ['postal_code'] },
          { longText: 'Napoli', types: ['locality'] },
          { longText: 'Italy', types: ['country'] },
        ],
        regularOpeningHours: {
          periods: [
            {
              open: { day: 1, hour: 9, minute: 0 },
              close: { day: 1, hour: 17, minute: 0 },
            },
          ],
        },
      });

      expect(details.placeId).toBe('place-1');
      expect(details.name).toBe('Trattoria Roma');
      expect(details.description).toBe('Cosy Italian spot.');
      expect(details.address).toEqual({
        street: 'Via Roma 1',
        postcode: '80100',
        city: 'Napoli',
        country: 'Italy',
      });
      expect(details.openingHours.find((day) => day.day === 'monday')).toEqual({
        day: 'monday',
        isOpen: true,
        timeRanges: [{ from: '09:00', to: '17:00' }],
      });
    });

    it('omits the description when Google has no editorial summary', () => {
      const details = toPlaceDetails({
        id: 'place-2',
        displayName: { text: 'No Summary Diner' },
      });

      expect(details.description).toBeUndefined();
      expect('description' in details).toBe(false);
    });
  });
});
