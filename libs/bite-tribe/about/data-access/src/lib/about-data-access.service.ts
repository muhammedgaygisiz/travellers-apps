import { inject, Injectable, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';

@Injectable({
  providedIn: 'root',
})
export class AboutDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);

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
