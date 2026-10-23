import { Pipe, PipeTransform } from '@angular/core';
import { Bite } from 'model';
import { biteImageSrc } from '../utils/bite-image-src';

@Pipe({ name: 'getImage' })
export class GetImagePipe implements PipeTransform {
  transform(bite: Bite | undefined): string {
    return biteImageSrc(bite);
  }
}
