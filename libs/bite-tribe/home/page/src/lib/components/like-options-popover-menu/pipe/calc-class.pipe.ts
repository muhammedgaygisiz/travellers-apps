import { Pipe, PipeTransform } from '@angular/core';
import { Bite } from 'model';

@Pipe({
  name: 'calcClass',
})
export class CalcClassPipe implements PipeTransform {
  transform(
    bite: Bite | undefined,
    userId: string | undefined,
    likeType: string
  ): string {
    const foundLike = bite?.likes?.find((like) => like.userId === userId);

    if (foundLike && foundLike.likeType === likeType) {
      return 'liked';
    }

    return '';
  }
}
