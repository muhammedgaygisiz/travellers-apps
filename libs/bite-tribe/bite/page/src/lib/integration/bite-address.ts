import type { Bite, Geopoint } from 'model';

/**
 * The address fields `enrichBiteAddressOnWrite` derives from the position.
 * The form has no control for any of them, so an edit leaves them as they
 * were unless it clears them itself.
 */
const DERIVED_ADDRESS_FIELDS = [
  'city',
  'region',
  'country',
  'countryCode',
  'formatted',
] as const;

const isSamePosition = (a?: Geopoint | null, b?: Geopoint | null): boolean =>
  a?.latitude === b?.latitude && a?.longitude === b?.longitude;

/**
 * The edited Bite, with its old address cleared when the edit moved it.
 *
 * Picking another restaurant moves the Bite, and the city and country the
 * backend derives from the new position arrive a few seconds after the save.
 * Until then the Bite shows no place rather than the one it just left - the
 * edit used to keep "Martin, Slovakia" on a Bite moved to Budapest.
 *
 * Null rather than absent: the edit is a merge, so an absent field is a field
 * left as it was, and Firestore rejects `undefined`.
 */
export const withAddressInvalidatedIfMoved = (
  edited: Bite,
  original: Pick<Bite, 'position'> | undefined,
): Bite => {
  if (!original || isSamePosition(edited.position, original.position)) {
    return edited;
  }

  const cleared = Object.fromEntries(
    DERIVED_ADDRESS_FIELDS.map((field) => [field, null]),
  );

  return {
    ...edited,
    ...cleared,
    addressStatus: 'pending',
  } as Bite;
};
