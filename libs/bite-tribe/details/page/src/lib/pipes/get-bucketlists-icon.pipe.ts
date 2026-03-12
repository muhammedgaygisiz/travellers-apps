import { Pipe, PipeTransform } from '@angular/core';
import { Bite, Bucketlist } from 'model';

@Pipe({
  name: 'getBucketlistsIcon',
})
export class GetBucketlistsIconPipe implements PipeTransform {
  transform(bite: Bite | undefined, lists: Bucketlist[]): string {
    if (!lists || !bite) {
      return 'bookmark-outline';
    }

    return lists.some((list) => list.biteIds?.includes(bite.id))
      ? 'bookmark'
      : 'bookmark-outline';
  }
}
