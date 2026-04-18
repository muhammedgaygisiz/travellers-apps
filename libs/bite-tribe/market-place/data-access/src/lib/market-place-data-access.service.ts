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

    const biteTrails = data.snapshots.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data,
        }) as BiteTrail,
    );

    return Promise.all(
      biteTrails.map(async (biteTrail) => {
        const sells = await FirebaseFirestore.getCollection({
          reference: `${BITE_TRAIL_COLLECTION}/${biteTrail.id}/sells`,
        });

        return {
          ...biteTrail,
          soldCount: sells.snapshots.length,
        };
      }),
    );
  };

  biteTrails = resource({
    loader: this.biteTrailsLoader.bind(this),
  });
}
