import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'count' })
export class CountPipe implements PipeTransform {
  transform(value: unknown[] | null | undefined): number {
    return value ? value.length : 0;
  }
}
