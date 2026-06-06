import { Pipe, PipeTransform } from '@angular/core';
import { Bite } from 'model';

@Pipe({ name: 'getImage' })
export class GetImagePipe implements PipeTransform {
  transform(bite: Bite | undefined): string {
    return bite?.imagePath || bite?.image || '';
  }
}
