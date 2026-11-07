import { getFirestore } from 'firebase-admin/firestore';
import { CallableRequest } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { logOperatorAction } from '../shared/operator-log';
import { requireAdmin } from '../shared/roles';
import { rebuildBiteCountries } from '../shared/utils/bite-countries';

export interface RebuildBiteCountriesResult {
  /** The countries now listed in `meta/biteCountries`. */
  countries: number;
}

/**
 * Rebuilds `meta/biteCountries` from every Bite (GitHub issue #1893).
 *
 * Operator-only: it reads the whole Bite collection, and the only surface that
 * offers it is the admin migrations area.
 */
export const rebuildBiteCountriesHandler = async (
  request: CallableRequest<void>,
): Promise<RebuildBiteCountriesResult> => {
  requireAdmin(request);

  logOperatorAction(request, {
    action: 'rebuildBiteCountries',
    targetType: 'bite',
    outcome: 'started',
  });

  const countryCodes = await rebuildBiteCountries(getFirestore());
  const result = { countries: countryCodes.length };

  logOperatorAction(request, {
    action: 'rebuildBiteCountries',
    targetType: 'bite',
    outcome: 'succeeded',
    details: { ...result },
  });

  return result;
};

export const rebuildBiteCountriesCallable = onAppCheck<void>(
  rebuildBiteCountriesHandler,
);
