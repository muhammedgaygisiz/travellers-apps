const GOOGLE_GEOCODING_BASE_URL =
  'https://maps.googleapis.com/maps/api/geocode/json';

export interface Position {
  latitude: number;
  longitude: number;
}

interface GoogleGeocodingLocation {
  lat?: unknown;
  lng?: unknown;
}

interface GoogleGeocodingResult {
  geometry?: { location?: GoogleGeocodingLocation };
}

export interface GoogleGeocodingResponse {
  status?: string;
  results?: GoogleGeocodingResult[];
}

const isValidCoordinate = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const extractPosition = (
  response: GoogleGeocodingResponse,
): Position | undefined => {
  const location = response.results?.[0]?.geometry?.location;

  if (
    location &&
    isValidCoordinate(location.lat) &&
    isValidCoordinate(location.lng)
  ) {
    return { latitude: location.lat, longitude: location.lng };
  }

  return undefined;
};

/**
 * Forward geocodes an address (e.g. a city or region) into a position using
 * the Google Maps Geocoding API. Returns undefined when the address cannot be
 * resolved.
 */
export const geocodeAddress = async (
  address: string,
  apiKey: string,
): Promise<Position | undefined> => {
  if (!apiKey) {
    throw new Error('Google Geocoding API key is not configured.');
  }

  const url = new URL(GOOGLE_GEOCODING_BASE_URL);
  url.searchParams.set('address', address);
  url.searchParams.set('key', apiKey);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Google Geocoding HTTP ${response.status}`);
  }

  const data = (await response.json()) as GoogleGeocodingResponse;

  if (data.status !== 'OK') {
    return undefined;
  }

  return extractPosition(data);
};
