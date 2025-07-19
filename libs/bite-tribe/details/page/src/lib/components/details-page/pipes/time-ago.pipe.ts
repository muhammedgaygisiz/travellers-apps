import { Pipe, PipeTransform } from '@angular/core';

const FALLBACK_CREATION_DATE = '2025-05-17T08:01:18.001Z';

@Pipe({
  name: 'timeAgo',
})
export class TimeAgoPipe implements PipeTransform {
  transform(value = FALLBACK_CREATION_DATE): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());

    // Convert to different time units
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    // Minutes
    if (diffMinutes < 60) {
      return diffMinutes <= 1 ? 'just now' : `${diffMinutes} min ago`;
    }

    // Hours
    if (diffHours < 24) {
      return `${diffHours} h ago`;
    }

    // Days (less than a week)
    if (diffDays < 7) {
      return `${diffDays} d ago`;
    }

    // Weeks (less than a month)
    if (diffDays < 30) {
      const remainingDays = diffDays % 7;
      return remainingDays > 0
        ? `${diffWeeks} w ${remainingDays} d ago`
        : `${diffWeeks} w ago`;
    }

    // Months (less than a year)
    if (diffDays < 365) {
      const remainingWeeks = Math.floor((diffDays % 30) / 7);
      return remainingWeeks > 0
        ? `${diffMonths} m ${remainingWeeks} w ago`
        : `${diffMonths} m ago`;
    }

    // Years
    const remainingMonths = Math.floor((diffDays % 365) / 30);
    return remainingMonths > 0
      ? `${diffYears} y ${remainingMonths} m ago`
      : `${diffYears} y ago`;
  }
}
