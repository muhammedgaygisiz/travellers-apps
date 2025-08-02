import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'isChecked' })
export class IsCheckedPipe implements PipeTransform {
  transform(value: string, selection: string[]) {
    return selection.includes(value);
  }
}
