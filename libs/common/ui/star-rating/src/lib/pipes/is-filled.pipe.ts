import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'isFilled' })
export class IsFilled implements PipeTransform {
  transform(index: number, hoveredIndex: number, rating: number): boolean {
    return index <= (hoveredIndex !== -1 ? hoveredIndex : rating);
  }
}
