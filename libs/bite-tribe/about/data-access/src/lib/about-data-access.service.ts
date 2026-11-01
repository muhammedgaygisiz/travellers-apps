import { Injectable, resource } from '@angular/core';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import { resourceValue } from 'utils';

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

  // A count read can reject, and `value()` throws in that state, which would
  // abort the About page's binding update instead of leaving a count blank.
  // See GitHub issue #1232.
  totalNumberBitesValue = resourceValue(this.totalNumberBites);
  totalNumberUsersValue = resourceValue(this.totalNumberUsers);
}
