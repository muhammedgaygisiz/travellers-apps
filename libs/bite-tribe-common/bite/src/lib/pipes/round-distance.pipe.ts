import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'roundDistance',
})
export class RoundDistancePipe implements PipeTransform {
  transform(value: string | undefined): string | undefined {
    const valueAsNumber = Number(value);
    if (!value || isNaN(valueAsNumber)) {
      return value;
    }
    if (inRange(Math.trunc(valueAsNumber), -10, 10)) {
      return value;
    }
    return Math.round(valueAsNumber).toString();
  }
}

const inRange = (x: number, min: number, max: number): boolean =>
  (x - min) * (x - max) < 0;
