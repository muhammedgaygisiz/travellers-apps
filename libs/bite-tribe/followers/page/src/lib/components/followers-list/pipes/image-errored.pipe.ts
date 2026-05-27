import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'imageErrored' })
export class ImageErroredPipe implements PipeTransform {
  transform(userId: string, erroredIds: Set<string>): boolean {
    return erroredIds.has(userId);
  }
}
