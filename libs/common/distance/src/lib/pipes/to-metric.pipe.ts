import { Pipe, PipeTransform } from '@angular/core';
import { toMetric } from '../utils/to-metric';

@Pipe({
  name: 'toMetric',
})
export class ToMetricPipe implements PipeTransform {
  transform(distance: string | undefined): string {
    return toMetric(distance);
  }
}
