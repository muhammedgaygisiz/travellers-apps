import {
  ErrorHandler,
  inject,
  Injectable,
  resource,
  ResourceLoader,
} from '@angular/core';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { resourceValue } from 'utils';
import type { BiteTrail } from 'model';

const BITE_TRAIL_COLLECTION = 'biteTrails';

@Injectable({
  providedIn: 'root',
})
export class MarketPlaceDataAccessService {
  private readonly errorHandler = inject(ErrorHandler);

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
        try {
          const sellsCount = await FirebaseFirestore.getCountFromServer({
            reference: `${BITE_TRAIL_COLLECTION}/${biteTrail.id}/sells`,
          });

          return {
            ...biteTrail,
            soldCount: sellsCount.count,
          };
        } catch (error) {
          this.errorHandler.handleError(error);

          return {
            ...biteTrail,
            soldCount: 0,
          };
        }
      }),
    );
  };

  biteTrails = resource({
    loader: this.biteTrailsLoader.bind(this),
  });

  /** Read guarded: `value()` throws once the read has failed (#1232). */
  biteTrailsValue = resourceValue(this.biteTrails, [] as BiteTrail[]);
}
