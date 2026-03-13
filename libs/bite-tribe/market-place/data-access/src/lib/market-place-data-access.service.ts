import { Injectable, resource, ResourceLoader } from '@angular/core';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import type { BiteTrail } from 'model';

const BITE_TRAIL_COLLECTION = 'biteTrails';

@Injectable({
  providedIn: 'root',
})
export class MarketPlaceDataAccessService {
  biteTrailsLoader: ResourceLoader<BiteTrail[], unknown> = async () => {
    const data = await FirebaseFirestore.getCollection({
      reference: BITE_TRAIL_COLLECTION,
    });

    return data.snapshots.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data,
        }) as BiteTrail,
    );
  };

  biteTrails = resource({
    loader: this.biteTrailsLoader.bind(this),
  });
}
