import { Pipe, PipeTransform } from '@angular/core';
import type { Trip } from 'model';

const toLocalDate = (tripDate: string): Date => {
  const [year, month, day] = tripDate.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * A trip's dates in the active language: the range when it has an end date,
 * otherwise the start date alone, which the template words as "since".
 *
 * Formatted by `Intl` rather than a translation key, and the language is an
 * argument so the pure pipe re-runs when it changes. See
 * `ssot/architecture/internationalization.md`.
 */
@Pipe({ name: 'tripDates' })
export class TripDatesPipe implements PipeTransform {
  transform(trip: Pick<Trip, 'startDate' | 'endDate'>, lang: string): string {
    // Typed locally: the Storybook build checks against an older `lib` that
    // lacks `formatRange`, though every runtime the app supports has it.
    const format = new Intl.DateTimeFormat(lang, {
      dateStyle: 'medium',
    }) as Intl.DateTimeFormat & {
      formatRange?: (start: Date, end: Date) => string;
    };
    const start = toLocalDate(trip.startDate);

    if (!trip.endDate) {
      return format.format(start);
    }

    const end = toLocalDate(trip.endDate);

    return format.formatRange
      ? format.formatRange(start, end)
      : `${format.format(start)} – ${format.format(end)}`;
  }
}
