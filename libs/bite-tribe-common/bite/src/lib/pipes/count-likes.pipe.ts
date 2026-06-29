import { Pipe, PipeTransform } from '@angular/core';
import { Bite } from 'model';
import { getTotalLikeCount } from '../utils/like-counts';

@Pipe({
  name: 'countLikes',
})
export class CountLikesPipe implements PipeTransform {
  transform(bite: Bite): number {
    return getTotalLikeCount(bite);
  }
}
