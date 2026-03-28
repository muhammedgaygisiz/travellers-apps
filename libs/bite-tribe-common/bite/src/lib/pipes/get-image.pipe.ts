import { Pipe, PipeTransform } from '@angular/core';
import { Bite } from 'model';

@Pipe({ name: 'getImage' })
export class GetImagePipe implements PipeTransform {
  async transform(bite: Bite | undefined): Promise<string> {
    const imagePath = bite?.imagePath || bite?.image;

    if (imagePath?.length && imagePath.length > 0) {
      return Promise.resolve(imagePath);
    }

    return Promise.resolve(''); //TODO: return local image
  }
}
