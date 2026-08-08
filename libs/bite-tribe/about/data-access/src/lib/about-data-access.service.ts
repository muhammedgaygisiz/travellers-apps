import { Injectable, resource } from '@angular/core';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
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

  totalNumberUsers = resource({
    loader: () =>
      FirebaseFirestore.getCountFromServer({
        reference: 'users',
      }).then((result) => result.count),
  });

  // A count read can reject, and `value()` throws in that state, which would
  // abort the About page's binding update instead of leaving a count blank.
  // See GitHub issue #1232.
  totalNumberBitesValue = resourceValue(this.totalNumberBites);
  totalNumberUsersValue = resourceValue(this.totalNumberUsers);
}
