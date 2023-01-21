import { Pipe, PipeTransform } from '@angular/core';
import memoize from 'memoizee';

const calculateFilterIcon = memoize((value: string) => {
  if (value === 'location') {
    return 'location-outline';
  }

  return value;
});

@Pipe({
  name: 'filterIcon',
  standalone: true,
})
export class FilterIconPipe implements PipeTransform {
  transform(value: string) {
    return calculateFilterIcon(value);
  }
}
