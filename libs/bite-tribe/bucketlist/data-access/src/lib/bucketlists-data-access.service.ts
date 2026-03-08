import { inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Bite, Bucketlist, RemoveBiteFromBucketlistParams } from 'model';
import { BiteTribeStoreService } from 'bite-tribe/store';

@Injectable({ providedIn: 'root' })
export class BucketlistsDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);

  bucketlists = toSignal(this.storeService.sortedBucketlists$, {
    initialValue: [] as Bucketlist[],
  });
  sorting = toSignal(this.storeService.bucketlistSorting$, {
    initialValue: 'name',
  });
  selectedBucketlist = toSignal(this.storeService.selectedBucketlist$, {
    initialValue: undefined as Bucketlist | undefined,
  });
  bitesBySelectedBucketlist = toSignal(
    this.storeService.bitesBySelectedBucketlist$,
    { initialValue: [] as Bite[] },
  );

  createAndSaveToBucketList(bucketListName: string): void {
    this.storeService.createBucketList(bucketListName);
  }

  setBucketlistSorting(sorting: string): void {
    this.storeService.setBucketlistSorting(sorting);
  }

  deleteBucketlist(bucketlistId: string): void {
    this.storeService.deleteBucketlist(bucketlistId);
  }

  updateBucketlistName(bucketlistId: string, name: string): void {
    this.storeService.updateBucketlistName(bucketlistId, name);
  }

  removeBiteFromBucketlist(params: RemoveBiteFromBucketlistParams): void {
    this.storeService.removeBiteFromBucketlist(params);
  }
}
