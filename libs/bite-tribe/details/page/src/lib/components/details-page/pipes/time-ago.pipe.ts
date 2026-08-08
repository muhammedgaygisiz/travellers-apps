import { Pipe, PipeTransform } from '@angular/core';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;
const MONTH_MS = 30 * DAY_MS;
const YEAR_MS = 365 * DAY_MS;

/**
 * The ladder the elapsed distance is measured against. The first entry whose
 * `until` the distance stays below owns the output, so the order matters.
 */
const UNITS: {
  until: number;
  ms: number;
  unit: Intl.RelativeTimeFormatUnit;
}[] = [
  { until: HOUR_MS, ms: MINUTE_MS, unit: 'minute' },
  { until: DAY_MS, ms: HOUR_MS, unit: 'hour' },
  { until: WEEK_MS, ms: DAY_MS, unit: 'day' },
  { until: MONTH_MS, ms: WEEK_MS, unit: 'week' },
  { until: YEAR_MS, ms: MONTH_MS, unit: 'month' },
  { until: Number.POSITIVE_INFINITY, ms: YEAR_MS, unit: 'year' },
];

/**
 * `Intl.RelativeTimeFormat` is not free to construct and this pipe runs once
 * per Bite timestamp and once per review on the details page, so the formatter
 * for the active language is kept.
 */
const formatters = new Map<string, Intl.RelativeTimeFormat>();

const getFormatter = (lang: string): Intl.RelativeTimeFormat => {
  let formatter = formatters.get(lang);

  if (!formatter) {
    formatter = new Intl.RelativeTimeFormat(lang, {
      // `auto` uses the natural wording a language has for the nearest values
      // - "yesterday", "gestern", "last week" - instead of counting them out.
      numeric: 'auto',
      // `short` is the compact form CLDR defines per language, so minutes stay
      // distinguishable from months in every locale. Hand-abbreviating them to
      // `min` and `m` was what made the English output ambiguous.
      style: 'short',
    });
    formatters.set(lang, formatter);
  }

  return formatter;
};

/**
 * Renders a timestamp as a relative distance from now, in the language handed
 * to it.
 *
 * The language is an argument rather than an injected `TranslocoService`
 * reading, because a pure pipe is only re-evaluated when one of its arguments
 * changes: a pipe that read the active language itself would keep rendering
 * the language that was active when the view was created. See GitHub issue
 * #1272.
 */
@Pipe({
  name: 'timeAgo',
})
export class TimeAgoPipe implements PipeTransform {
  transform(value: string | undefined | null, lang = 'en'): string {
    if (!value) {
      return '';
    }

    const timestamp = new Date(value).getTime();

    if (Number.isNaN(timestamp)) {
      return '';
    }

    // Signed on purpose: negative is the past, positive the future. Taking the
    // absolute difference used to render a timestamp ahead of now - clock skew,
    // a bad write - as time already elapsed.
    const deltaMs = timestamp - Date.now();
    const distanceMs = Math.abs(deltaMs);
    const formatter = getFormatter(lang);

    if (distanceMs < MINUTE_MS) {
      return formatter.format(0, 'second');
    }

    const { ms, unit } =
      UNITS.find(({ until }) => distanceMs < until) ?? UNITS[UNITS.length - 1];

    // Truncated rather than rounded, so a value never claims a unit it has not
    // reached yet: 89 minutes is "1 hr. ago", not "2 hr. ago".
    return formatter.format(Math.trunc(deltaMs / ms), unit);
  }
}
