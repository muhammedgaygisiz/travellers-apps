import { extractPosition, geocodeAddress } from './geocode';

describe('geocode', () => {
  describe('extractPosition', () => {
    it('returns the position of the first result', () => {
      expect(
        extractPosition({
          status: 'OK',
          results: [{ geometry: { location: { lat: 40.85, lng: 14.26 } } }],
        }),
      ).toEqual({ latitude: 40.85, longitude: 14.26 });
    });

    it('returns undefined when coordinates are missing or invalid', () => {
      expect(extractPosition({ status: 'OK', results: [] })).toBeUndefined();
      expect(
        extractPosition({
          status: 'OK',
          results: [{ geometry: { location: { lat: 'a', lng: 14.26 } } }],
        }),
      ).toBeUndefined();
      expect(extractPosition({})).toBeUndefined();
    });
  });

  describe('geocodeAddress', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('throws when the API key is missing', async () => {
      await expect(geocodeAddress('Napoli', '')).rejects.toThrow(
        'Google Geocoding API key is not configured.',
      );
    });

    it('resolves the position for an address', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'OK',
          results: [{ geometry: { location: { lat: 40.85, lng: 14.26 } } }],
        }),
      } as Response);

      await expect(geocodeAddress('Napoli', 'api-key')).resolves.toEqual({
        latitude: 40.85,
        longitude: 14.26,
      });

      const requestedUrl = String(fetchSpy.mock.calls[0][0]);
      expect(requestedUrl).toContain('address=Napoli');
      expect(requestedUrl).toContain('key=api-key');
    });

    it('returns undefined when Google reports a non-OK status', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ZERO_RESULTS', results: [] }),
      } as Response);

      await expect(
        geocodeAddress('nowhere-at-all', 'api-key'),
      ).resolves.toBeUndefined();
    });

    it('throws when the HTTP response is not ok', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      await expect(geocodeAddress('Napoli', 'api-key')).rejects.toThrow(
        'Google Geocoding HTTP 500',
      );
    });
  });
});
