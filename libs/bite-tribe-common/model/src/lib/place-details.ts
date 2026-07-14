import type { Address } from './address';
import type { DaySchedule } from './opening-hours';

/**
 * App-shaped result of the `getPlaceDetails` callable. The backend already
 * parses the Google Places response into the domain model (address split into
 * street/postcode/city/country and opening hours mapped to `DaySchedule[]`), so
 * consumers can apply it directly to the restaurant form.
 */
export interface PlaceDetails {
  placeId: string;
  name: string;
  /** Only present when Google returns an `editorialSummary`. */
  description?: string;
  address: Address;
  openingHours: DaySchedule[];
}
