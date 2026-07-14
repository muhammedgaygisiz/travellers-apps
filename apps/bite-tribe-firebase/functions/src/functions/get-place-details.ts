import { logger } from 'firebase-functions';
import { HttpsError } from 'firebase-functions/https';
import { defineSecret } from 'firebase-functions/params';
import { onAppCheck } from './callable-options';

const GOOGLE_GEOCODING_API_KEY_ENV = 'GOOGLE_GEOCODING_API_KEY';
const GOOGLE_PLACE_DETAILS_URL = 'https://places.googleapis.com/v1/places';
// Keep the field mask minimal - cost is billed per-field SKU. No `photos`:
// prefilling the restaurant image from Google Places is out of scope.
const GOOGLE_PLACE_DETAILS_FIELD_MASK =
  'id,displayName,editorialSummary,addressComponents,regularOpeningHours';

const googleMapsApiKey = defineSecret(GOOGLE_GEOCODING_API_KEY_ENV);

type Weekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

// Google encodes weekdays as 0 = Sunday .. 6 = Saturday.
const WEEKDAYS: Weekday[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

const DAY_ORDER: Weekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const END_OF_DAY = '23:59';
const START_OF_DAY = '00:00';

interface TimeRange {
  from: string;
  to: string;
}

interface DaySchedule {
  day: Weekday;
  isOpen: boolean;
  timeRanges: TimeRange[];
}

interface Address {
  street: string;
  postcode: string;
  city: string;
  country: string;
}

export interface PlaceDetails {
  placeId: string;
  name: string;
  description?: string;
  address: Address;
  openingHours: DaySchedule[];
}

interface GetPlaceDetailsRequest {
  placeId?: unknown;
}

interface GoogleAddressComponent {
  longText?: string;
  shortText?: string;
  types?: string[];
}

interface GoogleTimeOfDay {
  day?: number;
  hour?: number;
  minute?: number;
}

interface GooglePeriod {
  open?: GoogleTimeOfDay;
  close?: GoogleTimeOfDay;
}

interface GoogleRegularOpeningHours {
  periods?: GooglePeriod[];
}

interface GooglePlaceDetailsResponse {
  id?: string;
  displayName?: { text?: string };
  editorialSummary?: { text?: string };
  addressComponents?: GoogleAddressComponent[];
  regularOpeningHours?: GoogleRegularOpeningHours;
}

const findComponent = (
  components: GoogleAddressComponent[],
  type: string,
): GoogleAddressComponent | undefined =>
  components.find((component) => component.types?.includes(type));

export const parseAddress = (
  components: GoogleAddressComponent[] = [],
): Address => {
  const route = findComponent(components, 'route')?.longText ?? '';
  const streetNumber =
    findComponent(components, 'street_number')?.longText ?? '';
  const street = [route, streetNumber].filter(Boolean).join(' ').trim();

  const postcode = findComponent(components, 'postal_code')?.longText ?? '';

  const locality = findComponent(components, 'locality')?.longText;
  const postalTown = findComponent(components, 'postal_town')?.longText;
  const city = locality ?? postalTown ?? '';

  const country = findComponent(components, 'country')?.longText ?? '';

  return { street, postcode, city, country };
};

const formatTime = (time?: GoogleTimeOfDay): string => {
  const hour = time?.hour ?? 0;
  const minute = time?.minute ?? 0;

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

const emptySchedule = (): Record<Weekday, TimeRange[]> => ({
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: [],
});

const weekdayFor = (day?: number): Weekday | undefined =>
  typeof day === 'number' ? WEEKDAYS[day] : undefined;

/**
 * Maps a Google `regularOpeningHours` payload to the app `DaySchedule[]` model.
 *
 * - Overnight ranges are split at midnight (Fri 18:00-02:00 becomes Fri
 *   18:00-23:59 + Sat 00:00-02:00).
 * - A period without a `close` means the place is open 24h that day, mapped to
 *   a single 00:00-23:59 range.
 * - Multiple periods for the same day produce multiple `timeRanges`.
 * - Days without any period are `isOpen: false` with empty `timeRanges`.
 */
export const toOpeningHours = (
  regularOpeningHours?: GoogleRegularOpeningHours,
): DaySchedule[] => {
  const ranges = emptySchedule();
  const periods = regularOpeningHours?.periods ?? [];

  periods.forEach((period) => {
    const openDay = weekdayFor(period.open?.day);

    if (!openDay) {
      return;
    }

    const openTime = formatTime(period.open);

    // No close time means the place is open 24 hours on the open day.
    if (!period.close) {
      ranges[openDay].push({ from: START_OF_DAY, to: END_OF_DAY });
      return;
    }

    const closeDay = weekdayFor(period.close.day) ?? openDay;
    const closeTime = formatTime(period.close);

    if (closeDay === openDay && closeTime > openTime) {
      ranges[openDay].push({ from: openTime, to: closeTime });
      return;
    }

    // Overnight or multi-day range: split at each midnight boundary.
    ranges[openDay].push({ from: openTime, to: END_OF_DAY });

    let cursor = ((period.open?.day ?? 0) + 1) % 7;

    while (cursor !== (period.close.day ?? 0)) {
      const intermediate = WEEKDAYS[cursor];
      ranges[intermediate].push({ from: START_OF_DAY, to: END_OF_DAY });
      cursor = (cursor + 1) % 7;
    }

    // A close at exactly midnight (00:00) ends the previous day at 23:59, so
    // there is no range to add on the closing day.
    if (closeTime !== START_OF_DAY) {
      ranges[closeDay].push({ from: START_OF_DAY, to: closeTime });
    }
  });

  return DAY_ORDER.map((day) => ({
    day,
    isOpen: ranges[day].length > 0,
    timeRanges: ranges[day],
  }));
};

export const toPlaceDetails = (
  response: GooglePlaceDetailsResponse,
): PlaceDetails => {
  const description = response.editorialSummary?.text;

  return {
    placeId: response.id ?? '',
    name: response.displayName?.text ?? '',
    ...(description ? { description } : {}),
    address: parseAddress(response.addressComponents),
    openingHours: toOpeningHours(response.regularOpeningHours),
  };
};

const loadPlaceDetails = async (
  placeId: string,
  apiKey: string,
): Promise<PlaceDetails> => {
  const response = await fetch(
    `${GOOGLE_PLACE_DETAILS_URL}/${encodeURIComponent(placeId)}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': GOOGLE_PLACE_DETAILS_FIELD_MASK,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Google Places Details HTTP ${response.status}`);
  }

  const data = (await response.json()) as GooglePlaceDetailsResponse;

  return toPlaceDetails(data);
};

export const getPlaceDetails = onAppCheck<GetPlaceDetailsRequest>(
  {
    secrets: [googleMapsApiKey],
  },
  async (request): Promise<PlaceDetails | null> => {
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'You must be signed in to load place details.',
      );
    }

    const { placeId } = request.data;

    if (typeof placeId !== 'string' || placeId.trim().length === 0) {
      throw new HttpsError(
        'invalid-argument',
        'placeId must be a non-empty string.',
      );
    }

    const apiKey = googleMapsApiKey.value();

    if (!apiKey) {
      throw new Error(`${GOOGLE_GEOCODING_API_KEY_ENV} is not configured.`);
    }

    try {
      return await loadPlaceDetails(placeId.trim(), apiKey);
    } catch (error) {
      logger.warn('getPlaceDetails: failed to load place details from Google', {
        error: error instanceof Error ? error.message : String(error),
      });

      return null;
    }
  },
);
