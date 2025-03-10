import { inject, LOCALE_ID, Pipe, PipeTransform } from '@angular/core';
import { Project } from './project';
import { formatNumber } from '@angular/common';

@Pipe({
  name: 'duration',
  standalone: true,
})
export class DurationPipe implements PipeTransform {
  localeId = inject(LOCALE_ID);

  transform({ from, to }: Project): string {
    const startYear = from.getFullYear();
    const startMonth = from.getMonth();
    const endYear = to.getFullYear();
    const endMonth = to.getMonth();

    const yearDifference = endYear - startYear;
    const monthDifference = endMonth - startMonth + 1;

    const durationInMonth = yearDifference * 12 + monthDifference;

    if (durationInMonth > 12) {
      const withMonth = durationInMonth % 12 > 0;

      return `${formatNumber(
        durationInMonth / 12,
        this.localeId,
        withMonth ? '1.1-1' : '1.0'
      )} years`;
    }

    return `${formatNumber(durationInMonth, this.localeId, '1.0')} month`;
  }
}
