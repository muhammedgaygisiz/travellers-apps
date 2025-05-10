import { Pipe, PipeTransform } from '@angular/core';
import { Bite } from 'model';

@Pipe({
  name: 'countLikes',
})
export class CountLikesPipe implements PipeTransform {
  transform(bite: Bite): number {
    return bite?.likes?.length || 0;
  }
}
