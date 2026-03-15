import { Pipe, PipeTransform } from '@angular/core';
import { Bite, Bucketlist } from 'model';

@Pipe({
  name: 'getBucketlistIcon',
})
export class GetBucketlistIconPipe implements PipeTransform {
  transform(bite: Bite | undefined, list: Bucketlist): string {
    if (!list || !bite) {
      return 'bookmark-outline';
    }

    return list.biteIds?.includes(bite.id) ? 'bookmark' : 'bookmark-outline';
  }
}
