import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'toMetric',
})
export class ToMetricPipe implements PipeTransform {
  transform(distance: string | undefined): string {
    if (!distance || distance === '0.00' || distance === 'NaN') {
      return '-';
    }

    return `${distance} km`;
  }
}
