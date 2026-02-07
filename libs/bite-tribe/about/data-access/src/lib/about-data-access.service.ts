import { Injectable, resource } from '@angular/core';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';

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
}
