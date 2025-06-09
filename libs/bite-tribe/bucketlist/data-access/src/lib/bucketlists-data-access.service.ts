import { inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Bucketlist } from 'model';
import { BiteTribeStoreService } from 'bite-tribe/store';

@Injectable({ providedIn: 'root' })
export class BucketlistsDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);

  bucketlists = toSignal(this.storeService.bucketlists$, {
    initialValue: [] as Bucketlist[],
  });
}
