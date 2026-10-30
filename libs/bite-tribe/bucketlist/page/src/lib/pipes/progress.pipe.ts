import { Pipe, PipeTransform } from '@angular/core';
import { Bucketlist } from 'model';
import { bucketlistProgress } from 'utils';

/** The list's progress, from the helper the completion celebration uses. */
@Pipe({ name: 'progress' })
export class ProgressPipe implements PipeTransform {
  transform(bucketlist: Bucketlist): number {
    return bucketlistProgress(bucketlist);
  }
}
