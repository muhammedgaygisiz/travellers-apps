import { Injectable, resource } from '@angular/core';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import { resourceValue } from 'utils';

export const BITE_COUNTRIES = 'meta/biteCountries';

/** Only the string entries: the document is backend-written, but untyped. */
const toCountryCodes = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((code): code is string => typeof code === 'string')
    : [];

@Injectable({
  providedIn: 'root',
})
export class AboutDataAccessService {
  totalNumberBites = resource({
    loader: () =>
      FirebaseFirestore.getCountFromServer({
        reference: 'bites',
      }).then((result) => result.count),
  });

  // Counted by a callable: the rules no longer let a member count the private
  // profiles themselves (GitHub issue #1863).
  totalNumberUsers = resource({
    loader: () =>
      FirebaseFunctions.callByName<void, number>({
        name: 'countUsers',
      }).then((result) => result.data),
  });

  /**
   * The countries with at least one Bite, for the globe (GitHub issue #1893).
   * One document kept by the backend, since Firestore cannot group Bites by
   * country; an absent document reads as no countries.
   */
  biteCountries = resource({
    loader: () =>
      FirebaseFirestore.getDocument<{ countryCodes?: unknown }>({
        reference: BITE_COUNTRIES,
      }).then(({ snapshot }) => toCountryCodes(snapshot?.data?.countryCodes)),
  });

  // A count read can reject, and `value()` throws in that state, which would
  // abort the About page's binding update instead of leaving a count blank.
  // See GitHub issue #1232.
  totalNumberBitesValue = resourceValue(this.totalNumberBites);
  totalNumberUsersValue = resourceValue(this.totalNumberUsers);
  biteCountriesValue = resourceValue(this.biteCountries);
}
