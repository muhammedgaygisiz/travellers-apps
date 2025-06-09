import { Pipe, PipeTransform } from '@angular/core';
import { Bite, Bucketlist } from 'model';

@Pipe({
  name: 'isInAny',
})
export class IsInPipe implements PipeTransform {
  transform(bite: Bite | undefined, lists: Bucketlist[]): string {
    if (!lists || !bite) {
      return 'add-outline';
    }

    return lists.some((list) => list.biteIds.includes(bite.id))
      ? 'bookmark'
      : 'add-outline';
  }
}
