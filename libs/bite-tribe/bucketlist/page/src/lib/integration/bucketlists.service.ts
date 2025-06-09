import { inject, Injectable } from '@angular/core';
import { BucketlistsDataAccessService } from 'bite-tribe/bucketlist-data-access';

@Injectable({
  providedIn: 'root',
})
export class BucketlistsService {
  dataAccess = inject(BucketlistsDataAccessService);

  bucketlists = this.dataAccess.bucketlists;
}
