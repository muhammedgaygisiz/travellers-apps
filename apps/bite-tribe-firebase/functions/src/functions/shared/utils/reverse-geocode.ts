const GOOGLE_GEOCODING_BASE_URL =
  'https://maps.googleapis.com/maps/api/geocode/json';

export interface Position {
  latitude: number;
  longitude: number;
}

export interface GoogleAddressComponent {
  long_name?: string;
  short_name?: string;
  types?: string[];
}

export interface GoogleGeocodingResult {
  formatted_address?: string;
  address_components?: GoogleAddressComponent[];
}

export interface GoogleGeocodingResponse {
  status?: string;
  error_message?: string;
  results?: GoogleGeocodingResult[];
}

export interface BiteAddress {
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  formatted?: string;
}

const findAddressComponent = (
  components: GoogleAddressComponent[],
  types: string[],
): GoogleAddressComponent | undefined =>
  components.find((component) =>
    types.some((type) => component.types?.includes(type)),
  );

export const extractBiteAddress = (
  result: GoogleGeocodingResult,
): BiteAddress => {
  const components = result.address_components || [];
  const city = findAddressComponent(components, [
    'locality',
    'postal_town',
    'administrative_area_level_2',
  ]);
  const region = findAddressComponent(components, [
    'administrative_area_level_1',
  ]);
  const country = findAddressComponent(components, ['country']);

  return {
    ...(city?.long_name ? { city: city.long_name } : {}),
    ...(region?.long_name ? { region: region.long_name } : {}),
    ...(country?.long_name ? { country: country.long_name } : {}),
    ...(country?.short_name ? { countryCode: country.short_name } : {}),
    ...(result.formatted_address
      ? { formatted: result.formatted_address }
      : {}),
  };
};

/**
 * Reverse geocodes a position into a structured address using the
 * Google Maps Geocoding API.
 */
export const reverseGeocode = async (
  position: Position,
  apiKey: string,
): Promise<BiteAddress> => {
  if (!apiKey) {
    throw new Error('Google Geocoding API key is not configured.');
  }

  const url = new URL(GOOGLE_GEOCODING_BASE_URL);
  url.searchParams.set('latlng', `${position.latitude},${position.longitude}`);
  url.searchParams.set('key', apiKey);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Google Reverse Geocoding HTTP ${response.status}`);
  }

  const data = (await response.json()) as GoogleGeocodingResponse;

  if (data.status !== 'OK') {
    throw new Error(
      `Google Reverse Geocoding returned ${data.status || 'unknown status'}.`,
    );
  }

  const result = data.results?.[0];

  if (!result) {
    throw new Error('Google Reverse Geocoding returned no results.');
  }

  return extractBiteAddress(result);
};
