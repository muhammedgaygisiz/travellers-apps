import { Pipe, PipeTransform } from '@angular/core';

/**
 * Capitalizes the first letter with the active language's casing rules
 * (issue \#1388).
 *
 * The language is an argument rather than an injected signal because a pure
 * pipe is not re-evaluated on a language change unless the language is one of
 * its inputs. It also matters for the result itself: in Turkish a leading `i`
 * uppercases to `İ`, so `istanbul kebap` has to render as `İstanbul kebap`
 * rather than `Istanbul kebap`.
 */
@Pipe({
  name: 'withFirstLetterUpperCase',
})
export class WithFirstLetterUpperCasePipe implements PipeTransform {
  transform(value: string | null | undefined, lang?: string): string {
    if (!value) return '';

    const firstLetter = lang
      ? value.charAt(0).toLocaleUpperCase(lang)
      : value.charAt(0).toUpperCase();

    return firstLetter + value.slice(1);
  }
}
