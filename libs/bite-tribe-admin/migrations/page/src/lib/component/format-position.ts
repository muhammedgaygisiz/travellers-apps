import { Geopoint } from 'model';

/**
 * Renders a stored position as `latitude, longitude`, with `-` for each part
 * that is absent.
 *
 * The migration tables list Bites as stored, and a document written before a
 * position was required can lack one even though {@link Geopoint} is required
 * on the model, so the parameter admits a missing position on purpose.
 */
export const formatPosition = (
  position: Partial<Geopoint> | null | undefined,
): string => `${position?.latitude ?? '-'}, ${position?.longitude ?? '-'}`;
