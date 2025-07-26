import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'isFilled' })
export class IsFilledPipe implements PipeTransform {
  transform(
    index: number,
    hoveredIndex: number,
    rating: number | undefined = 0
  ): boolean {
    return index <= (hoveredIndex !== -1 ? hoveredIndex : rating);
  }
}
