import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'withFirstLetterUpperCase',
})
export class WithFirstLetterUpperCasePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}
