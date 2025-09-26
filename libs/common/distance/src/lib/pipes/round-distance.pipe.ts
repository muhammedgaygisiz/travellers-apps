import { Pipe, PipeTransform } from '@angular/core';
import { roundDistance } from '../utils/round-distance';

@Pipe({
  name: 'roundDistance',
})
export class RoundDistancePipe implements PipeTransform {
  transform(value: string | undefined): string | undefined {
    return roundDistance(value);
  }
}
