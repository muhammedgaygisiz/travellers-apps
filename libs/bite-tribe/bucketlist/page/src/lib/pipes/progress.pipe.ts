import { Pipe, PipeTransform } from '@angular/core';
import { Bucketlist } from 'model';

@Pipe({ name: 'progress' })
export class ProgressPipe implements PipeTransform {
  transform(bucketlist: Bucketlist): number {
    const total = bucketlist?.biteIds?.length ?? 0;

    if (total === 0) {
      return 0;
    }

    const triedOut = bucketlist.triedOutBites?.length ?? 0;

    return triedOut / total;
  }
}
