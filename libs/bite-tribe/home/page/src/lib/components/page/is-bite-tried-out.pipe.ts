import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'isBiteTriedOut' })
export class IsBiteTriedOutPipe implements PipeTransform {
  transform(biteId: string, triedOutBiteIds: string[]): boolean {
    return triedOutBiteIds.includes(biteId);
  }
}
