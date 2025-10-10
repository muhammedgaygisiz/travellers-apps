import { DestroyRef, inject } from '@angular/core';
import { BiteTribeStoreService } from '../bite-tribe-store.service';
import { Title } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { tap } from 'rxjs';

export const biteTitleResolver = (): string => {
  const storeService = inject(BiteTribeStoreService);
  const destroyRef = inject(DestroyRef);
  const title = inject(Title);

  storeService.bite$
    .pipe(
      takeUntilDestroyed(destroyRef),
      tap((bite) => {
        if (bite?.name) {
          title.setTitle(bite.name);
        }
      }),
    )
    .subscribe();

  return 'Bite';
};
