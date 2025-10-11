import { inject } from '@angular/core';
import { BiteTribeStoreService } from '../bite-tribe-store.service';
import { map, Observable } from 'rxjs';
import { Bite } from 'model';
import { ResolveFn } from '@angular/router';

export const biteTitleResolver: ResolveFn<string> = (): Observable<string> => {
  const storeService = inject(BiteTribeStoreService);

  return storeService.bite$.pipe(
    map((bite: Bite | undefined): string => {
      if (bite?.name) {
        return bite.name;
      }

      return 'Bite';
    }),
  );
};
